import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { AppLogger } from './common/logger/logger.service';

async function bootstrap() {
    // bufferLogs: true retiene los logs de inicio en memoria hasta que AppLogger esté instanciado
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    });

    const appLogger = app.get(AppLogger);
    app.useLogger(appLogger);

    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    appLogger.log(`Servidor iniciado exitosamente en el puerto ${port}`);
}
bootstrap();
