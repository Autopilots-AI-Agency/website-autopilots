import { pino, levels, type DestinationStream } from 'pino';
import type { FastifyReply, FastifyRequest } from 'fastify';

// Error messages/properties can contain SQL, URLs and credentials. Keep diagnostics
// useful without copying those values into the shared log stream.
function serializeError(value: unknown) {
    const error = value instanceof Error ? value : undefined;
    const label = (value: unknown) => typeof value === 'string' && /^[\w.-]{1,80}$/.test(value) ? value : undefined;
    const heading = `${error?.name || 'Error'}: ${error?.message || ''}\n`;
    // Strip the entire heading first: error messages themselves may be multiline.
    const frames = typeof error?.stack === 'string' && error.stack.startsWith(heading)
        ? error.stack.slice(heading.length).split('\n').filter(line => /^\s+at /.test(line)).join('\n') : undefined;
    return {
        type: label(error?.name) || 'Error',
        code: label(error && 'code' in error ? error.code : undefined),
        message: 'Operation failed',
        stack: frames,
    };
}

interface LoggerOptions {
    env?: NodeJS.ProcessEnv;
    stream?: DestinationStream;
}

export function createLogger({ env = process.env, stream }: LoggerOptions = {}) {
    const level = env.LOG_LEVEL?.trim().toLowerCase() || 'info';
    return pino({
        level: Object.hasOwn(levels.values, level) ? level : 'info',
        base: { service: env.SERVICE_NAME || 'backend-api', pid: process.pid },
        messageKey: 'message',
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        formatters: { level: label => ({ level: label }) },
        hooks: {
            logMethod(args, method) {
                // Pino otherwise uses the raw error message when none is supplied.
                const first = args[0];
                if (args[1] === undefined && (first instanceof Error
                    || (typeof first === 'object' && first !== null && 'err' in first))) {
                    args[1] = 'Operation failed';
                }
                method.apply(this, args);
            },
        },
        serializers: {
            err: serializeError,
            req: (request: FastifyRequest) => ({ method: request.method, route: request.routeOptions?.url || 'unmatched' }),
            res: (reply: FastifyReply) => ({ statusCode: reply.statusCode }),
        },
        redact: ['password', 'token', 'apiKey', 'authorization', 'cookie',
            '*.password', '*.token', '*.apiKey', '*.authorization', '*.cookie',
            'headers["rumata-api-key"]', 'headers["x-api-key"]', 'headers["set-cookie"]'],
    }, stream);
}

