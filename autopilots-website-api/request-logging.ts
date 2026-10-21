import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { FastifyInstance } from 'fastify';

export function requestId(request: IncomingMessage) {
    const candidate = request.headers['x-request-id'];
    return typeof candidate === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(candidate)
        ? candidate : randomUUID();
}

export function registerRequestLogging(app: FastifyInstance,
    { slowRequestMs = process.env.SLOW_HTTP_REQUEST_MS }: { slowRequestMs?: number | string } = {}) {
    const configured = Number(slowRequestMs ?? 2000);
    const threshold = Number.isFinite(configured) && configured >= 0 ? configured : 2000;
    app.addHook('onRequest', (request, reply, done) => {
        const started = process.hrtime.bigint();
        let recorded = false;
        reply.header('x-request-id', request.id);
        const fields = { http_method: request.method, http_route: request.routeOptions.url || 'unmatched' };
        request.log.info({ event: 'http_request_received', ...fields }, 'HTTP request received');
        const record = (outcome: 'completed' | 'client_aborted') => {
            if (recorded) return;
            recorded = true;
            const duration = Number(process.hrtime.bigint() - started) / 1e6;
            const status = outcome === 'client_aborted' ? 499 : reply.statusCode;
            const length = Number(reply.getHeader('content-length'));
            const level = status >= 500 || outcome === 'client_aborted' || duration >= threshold ? 'warn' : 'info';
            request.log[level]({
                event: 'http_request_completed', ...fields,
                http_status_code: status, http_status_class: `${Math.floor(status / 100)}xx`,
                duration_ms: Number(duration.toFixed(3)),
                response_size_bytes: Number.isFinite(length) && length >= 0 ? length : undefined,
                outcome,
            }, 'HTTP request completed');
        };
        reply.raw.once('finish', () => record('completed'));
        reply.raw.once('close', () => record(reply.raw.writableFinished ? 'completed' : 'client_aborted'));
        done();
    });
}
