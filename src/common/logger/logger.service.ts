import * as fs from 'fs';
import * as path from 'path';

import { Injectable, LoggerService, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class AppLogger implements LoggerService, OnModuleDestroy {
    private logStream: fs.WriteStream;

    constructor() {
        const dateStamp = new Date().toISOString().split('T')[0];
        const logDir = path.join(process.cwd(), 'logs');

        // Garantiza la existencia del directorio de almacenamiento
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logFile = path.join(logDir, `app-${dateStamp}.log`);
        // Abre el stream en modo append ('a')
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

    private write(level: string, message: string, trace?: string) {
        const timestamp = new Date().toISOString();
        const formattedLog = `[${timestamp}] [${level}] ${message}${trace ? '\n[Stack Trace]: ' + trace : ''}\n`;

        // Escritura persistente en disco
        this.logStream.write(formattedLog);

        // Salida formateada en consola
        console.info(formattedLog.trim());
    }

    onModuleDestroy() {
        if (this.logStream) {
            this.logStream.end();
        }
    }
}
