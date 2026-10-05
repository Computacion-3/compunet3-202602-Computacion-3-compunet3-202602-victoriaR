import * as crypto from 'node:crypto';
import { STATUS_CODES } from 'node:http';

import { CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

import { AppLogger } from '../logger/logger.service';

type TraceableRequest = Request & { correlationId: string };

@Injectable()
export class TraceabilityInterceptor implements NestInterceptor {
    constructor(private readonly logger: AppLogger) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest<TraceableRequest>();
        const response = httpContext.getResponse<Response>();
        const correlationId = request.header('x-correlation-id')?.trim() || crypto.randomUUID();
        const startedAt = Date.now();

        request.correlationId = correlationId;
        response.setHeader('x-correlation-id', correlationId);

        let statusCode = response.statusCode;

        return new Observable((subscriber) =>
            this.logger.runWithTrace(correlationId, () =>
                next
                    .handle()
                    .pipe(
                        tap({
                            next: () => {
                                statusCode = response.statusCode;
                            },
                            error: (error: unknown) => {
                                statusCode = this.getErrorStatus(error, response.statusCode);
                            },
                        }),
                        finalize(() => {
                            const duration = Date.now() - startedAt;
                            const status = STATUS_CODES[statusCode] ?? 'Unknown';
                            const path = request.originalUrl || request.url;

                            this.logger.logWithTrace(
                                correlationId,
                                'TRACE',
                                `[${request.method} ${path}] [${statusCode} ${status}] [Duration: ${duration}ms]`,
                            );
                        }),
                    )
                    .subscribe(subscriber),
            ),
        );
    }

    private getErrorStatus(error: unknown, currentStatus: number): number {
        if (error instanceof HttpException) {
            return error.getStatus();
        }

        return currentStatus >= 400 ? currentStatus : HttpStatus.INTERNAL_SERVER_ERROR;
    }
}
