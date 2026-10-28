import { registerScanEmail } from './scan-email.ts';
import { registerCampaign } from './campaign.ts';
import { registerConversionWebhooks } from './conversion-webhooks.ts';
import { registerConsultant } from './consultant.ts';
import { registerScan } from './scan.ts';
import { registerScanRetention } from './scan-retention.ts';
import { registerAuthentication } from './auth.ts';
import { registerAccounts } from './accounts.ts';
import Fastify, { LogController, type FastifyBaseLogger, type FastifyError } from 'fastify';
import swagger from '@fastify/swagger';
import { createLogger } from './logger.ts';
import { registerRequestLogging, requestId } from './request-logging.ts';
import type { Database } from './database.ts';

interface AppOptions {
    database?: Database | null;
    logger?: FastifyBaseLogger;
    slowRequestMs?: number | string;
    authEnv?: NodeJS.ProcessEnv;
    accounts?: boolean;
}

export async function createApp({ database = null, logger = createLogger(), slowRequestMs, authEnv, accounts = false }: AppOptions = {}) {
    const app = Fastify({
        bodyLimit: 1048576,
        loggerInstance: logger,
        logController: new LogController({ disableRequestLogging: true, requestIdLogLabel: 'request_id' }),
        requestIdHeader: false,
        genReqId: requestId,
    });
    registerRequestLogging(app, { slowRequestMs });
    registerAuthentication(app, authEnv);
    await app.register(swagger, {
        openapi: { info: { title: 'Backend API', version: '1.0.0' },
            components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
            security: [{ bearerAuth: [] }],
        },
    });
    app.setErrorHandler<FastifyError>((error, request, reply) => {
        // Never serialize raw SQL, connection strings, credentials or internal exceptions.
        const code = error.statusCode ?? 500;
        const status = error.validation ? 400 : Number.isInteger(code) && code >= 400 && code < 600 ? code : 500;
        request.log[status >= 500 ? 'error' : 'warn']({
            event: 'http_request_failed', err: error, http_status_code: status,
        }, 'HTTP request failed');
        reply.code(status).send({ error: status === 413 ? 'Request too large' : status < 500 ? 'Invalid request' : 'Request failed' });
    });
    app.setNotFoundHandler((request, reply) => reply.code(404).send({ error: 'Not found' }));
    // Probes must work while PostgreSQL sleeps. Application queries wake it on demand.
    app.get('/health', {
        config: { public: true },
        schema: {
            security: [],
            summary: 'Check service readiness',
            response: {
                200: { type: 'object', required: ['status'], properties: { status: { type: 'string' } } },
            },
        },
    }, async () => ({ status: 'ready' }));
    app.get('/openapi.json', { config: { public: true }, schema: { hide: true, security: [] } }, async () => app.swagger());
    if (accounts) await registerAccounts(app, database, authEnv);
    // Register application routes with validation/response schemas here, after swagger.
    // Authorize ownership with request.user!.id before private reads, writes or jobs.
    // Enable accounts in server.ts with createApp({ database, logger, accounts: true }).
    // For apps without accounts, mark intentional public routes config: { public: true } / security: [].
    // Use database.pool with parameterized SQL and database.schema for factory tables.
    await registerScan(app, database, authEnv ?? process.env);
    await registerScanEmail(app, database, authEnv ?? process.env);
    await registerScanRetention(app, database, authEnv ?? process.env);
    await registerConsultant(app, database, authEnv ?? process.env);
    await registerCampaign(app, database, authEnv ?? process.env);
    await registerConversionWebhooks(app, database, authEnv ?? process.env);
    if (database) app.addHook('onClose', async () => database.pool.end());
    return app;
}
