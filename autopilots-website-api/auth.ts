import jwt from 'jsonwebtoken';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
    interface FastifyContextConfig { public?: boolean }
    interface FastifyRequest { user: { id: string } | null }
}

/** All application routes require a verified session unless explicitly public. */
export function registerAuthentication(app: FastifyInstance, env: NodeJS.ProcessEnv = process.env) {
    app.decorateRequest('user', null);
    app.addHook('onRequest', async (request, reply) => {
        if (request.routeOptions.config.public === true || !request.routeOptions.url) return;
        const secret = env.JWT_SECRET;
        if (!secret?.trim()) return reply.code(503).send({ error: 'Authentication unavailable' });
        const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization || '');
        if (!match) return reply.code(401).send({ error: 'Unauthorized' });
        try {
            const claims = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
            if (typeof claims === 'string' || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) throw new Error();
            const identity = claims.id ?? claims.sub;
            if (!(typeof identity === 'string' && identity.trim() && identity === identity.trim())
                && !(typeof identity === 'number' && Number.isSafeInteger(identity) && identity > 0)) throw new Error();
            if (claims.sub !== undefined && claims.sub !== String(identity)) throw new Error();
            if (claims.factoryId !== undefined && claims.factoryId !== env.JWT_FACTORY_ID) throw new Error();
            request.user = { id: String(identity) };
        } catch {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
    });
}
