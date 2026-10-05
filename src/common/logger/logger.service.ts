import * as fs from 'fs';
import * as path from 'path';
import { AsyncLocalStorage } from 'node:async_hooks';

import { Injectable, LoggerService, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class AppLogger implements LoggerService, OnModuleDestroy {
    private logStream: fs.WriteStream;
    private readonly traceStorage = new AsyncLocalStorage<string>();

    constructor() {
        const dateStamp = new Date().toISOString().split('T')[0];
        const logDir = path.join(process.cwd(), 'logs');

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logFile = path.join(logDir, `app-${dateStamp}.log`);
        this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
    }

    log(message: string) {
        this.write('LOG', message);
    }

    error(message: string, trace?: string) {
        this.write('ERROR', message, trace);
    }

    warn(message: string) {
        this.write('WARN', message);
    }

    debug(message: string) {
        this.write('DEBUG', message);
    }

    verbose(message: string) {
        this.write('VERBOSE', message);
    }

    runWithTrace<T>(correlationId: string, callback: () => T): T {
        return this.traceStorage.run(correlationId, callback);
    }

    logWithTrace(correlationId: string, level: string, message: string): void {
        this.write(level, message, undefined, correlationId);
    }

    private write(level: string, message: string, trace?: string, correlationId?: string) {
        const timestamp = new Date().toISOString();
        const activeCorrelationId = correlationId ?? this.traceStorage.getStore();
        const correlationSuffix = activeCorrelationId ? ` [CorrelationID: ${activeCorrelationId}]` : '';
        const formattedLog = `[${timestamp}] [${level}] ${message}${correlationSuffix}${trace ? '\n[Stack Trace]: ' + trace : ''}\n`;

        this.logStream.write(formattedLog);

        console.info(formattedLog.trim());
    }

    onModuleDestroy() {
        if (this.logStream) {
            this.logStream.end();
        }
    }
}
