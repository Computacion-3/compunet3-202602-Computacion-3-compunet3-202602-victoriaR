import { Injectable } from '@nestjs/common';

import { AppLogger } from './common/logger/logger.service';

@Injectable()
export class AppService {
    constructor(private readonly logger: AppLogger) {}

    getHello(): string {
        this.logger.log('El método getHello ha sido invocado');
        this.logger.debug('Generando respuesta estática para el cliente');
        return 'Hello World!';
    }
}
