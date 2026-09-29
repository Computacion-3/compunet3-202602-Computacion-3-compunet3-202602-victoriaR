import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
    // Instancia del logger asignando el contexto de la clase actual
    private readonly logger = new Logger(AppService.name);

    getHello(): string {
        this.logger.log('El método getHello ha sido invocado');
        this.logger.debug('Generando respuesta estática para el cliente');
        return 'Hello World!';
    }
}
