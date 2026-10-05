import { AppLogger } from './logger.service';

describe('AppLogger', () => {
    let logger: AppLogger;
    let write: jest.Mock;
    let end: jest.Mock;
    let consoleInfo: jest.SpyInstance;

    beforeEach(() => {
        logger = new AppLogger();
        logger.onModuleDestroy();
        write = jest.fn();
        end = jest.fn();
        Reflect.set(logger, 'logStream', { write, end });
        consoleInfo = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        logger.onModuleDestroy();
        consoleInfo.mockRestore();
    });

    it('adds the active correlation ID to every log line in the async context', () => {
        logger.runWithTrace('trace-context-123', () => logger.debug('business event'));

        expect(write).toHaveBeenCalledWith(
            expect.stringContaining('[DEBUG] business event [CorrelationID: trace-context-123]'),
        );
        expect(consoleInfo).toHaveBeenCalledWith(expect.stringContaining('[CorrelationID: trace-context-123]'));
    });

    it('supports writing a trace log with an explicit correlation ID', () => {
        logger.logWithTrace('explicit-trace-456', 'TRACE', '[GET /api/users] [200 OK] [Duration: 1ms]');

        expect(write).toHaveBeenCalledWith(
            expect.stringContaining(
                '[TRACE] [GET /api/users] [200 OK] [Duration: 1ms] [CorrelationID: explicit-trace-456]',
            ),
        );
    });
});
