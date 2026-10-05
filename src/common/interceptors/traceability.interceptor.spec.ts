import { BadRequestException, CallHandler, ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Request, Response } from 'express';
import { lastValueFrom, of, throwError } from 'rxjs';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppController } from '../../app.controller';
import { AppService } from '../../app.service';
import { AppLogger } from '../logger/logger.service';

import { TraceabilityInterceptor } from './traceability.interceptor';

describe('TraceabilityInterceptor', () => {
    const loggerMock = {
        runWithTrace: jest.fn((_correlationId: string, callback: () => unknown) => callback()),
        logWithTrace: jest.fn(),
    };
    const logger = loggerMock as unknown as AppLogger;
    let interceptor: TraceabilityInterceptor;

    const createContext = (request: Request, response: Response): ExecutionContext =>
        ({
            switchToHttp: () => ({
                getRequest: () => request,
                getResponse: () => response,
            }),
        }) as ExecutionContext;

    const createRequest = (correlationId?: string): Request =>
        ({
            method: 'GET',
            originalUrl: '/api/users',
            url: '/api/users',
            header: jest.fn().mockReturnValue(correlationId),
        }) as unknown as Request;

    const createResponse = () => {
        const setHeader = jest.fn();

        return {
            response: {
                statusCode: 200,
                setHeader,
            } as unknown as Response,
            setHeader,
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();
        interceptor = new TraceabilityInterceptor(logger);
    });

    it('propagates a supplied correlation ID and logs the completed request', async () => {
        const request = createRequest('test-cid-12345');
        const { response, setHeader } = createResponse();
        const context = createContext(request, response);
        const next = { handle: () => of({ success: true }) } as CallHandler;

        await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toEqual({ success: true });

        expect(request.correlationId).toBe('test-cid-12345');
        expect(setHeader).toHaveBeenCalledWith('x-correlation-id', 'test-cid-12345');
        expect(loggerMock.runWithTrace).toHaveBeenCalledWith('test-cid-12345', expect.any(Function));
        expect(loggerMock.logWithTrace).toHaveBeenCalledWith(
            'test-cid-12345',
            'TRACE',
            expect.stringMatching(/^\[GET \/api\/users\] \[200 OK\] \[Duration: \d+ms\]$/),
        );
    });

    it('generates and returns a UUID when the request has no correlation ID', async () => {
        const request = createRequest();
        const { response, setHeader } = createResponse();
        const context = createContext(request, response);
        const next = { handle: () => of('ok') } as CallHandler;

        await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toBe('ok');

        expect(request.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(setHeader).toHaveBeenCalledWith('x-correlation-id', request.correlationId);
    });

    it('logs the HTTP status from a Nest exception without altering the error', async () => {
        const request = createRequest('invalid-request');
        const { response } = createResponse();
        const context = createContext(request, response);
        const error = new BadRequestException('invalid request');
        const next = { handle: () => throwError(() => error) } as CallHandler;

        await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toBe(error);

        expect(loggerMock.logWithTrace).toHaveBeenCalledWith(
            'invalid-request',
            'TRACE',
            expect.stringMatching(/^\[GET \/api\/users\] \[400 Bad Request\] \[Duration: \d+ms\]$/),
        );
    });
});

describe('TraceabilityInterceptor HTTP integration', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                AppService,
                AppLogger,
                {
                    provide: APP_INTERCEPTOR,
                    useClass: TraceabilityInterceptor,
                },
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('returns a client-provided correlation ID in the HTTP response', async () => {
        await request(app.getHttpServer())
            .get('/')
            .set('x-correlation-id', 'http-test-cid')
            .expect(200)
            .expect('x-correlation-id', 'http-test-cid')
            .expect('Hello World!');
    });

    it('returns a generated UUID when the HTTP request has no correlation ID', async () => {
        const response = await request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');

        expect(response.headers['x-correlation-id']).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
    });
});
