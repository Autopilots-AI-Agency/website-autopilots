import { createApp } from './app.ts';
import { connectDatabase } from './database.ts';
import { createLogger } from './logger.ts';

const logger = createLogger();
// Observe fatal failures without suppressing Node's non-zero exit behavior.
process.on('uncaughtExceptionMonitor', (error, origin) => {
    logger.fatal({ event: 'process_failed', err: error, origin }, 'Backend process failed');
});
let app: Awaited<ReturnType<typeof createApp>> | undefined;
let database: ReturnType<typeof connectDatabase> | null | undefined;
let closing = false;
async function shutdown(signal: NodeJS.Signals) {
    if (closing) return;
    closing = true;
    logger.info({ event: 'server_stopping', signal }, 'Backend shutting down');
    const deadline = setTimeout(() => {
        logger.fatal({ event: 'server_shutdown_timeout' }, 'Backend shutdown timed out');
        process.exit(1);
    }, 10000);
    deadline.unref();
    try {
        await app?.close();
        logger.info({ event: 'server_stopped' }, 'Backend stopped');
    } catch (error) {
        logger.error({ event: 'server_shutdown_failed', err: error }, 'Backend shutdown failed');
        process.exitCode = 1;
    }
    finally { clearTimeout(deadline); }
}
try {
    database = process.env.DATABASE_URL ? connectDatabase(process.env, logger) : null;
    app = await createApp({ database, logger });
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
    const address = await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT || 8080) });
    logger.info({ event: 'server_started', address }, 'Backend listening');
} catch (error) {
    logger.fatal({ event: 'server_startup_failed', err: error }, 'Backend startup failed. Check runtime configuration.');
    try {
        if (app) await app.close();
        else if (database) await database.pool.end();
    } catch (closeError) {
        logger.error({ event: 'server_shutdown_failed', err: closeError }, 'Backend cleanup failed');
    }
    process.exitCode = 1;
}

