import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { FastifyInstance } from 'fastify';
import type { Database } from './database.ts';
import { accountStore } from './account-store.ts';
import { accountLimits } from './account-limits.ts';
import { hashPassword, verifyPassword } from './passwords.ts';

const expiresIn = 3600;
const userSchema = {
    type: 'object', required: ['id', 'email'], additionalProperties: false,
    properties: { id: { type: 'string' }, email: { type: 'string' } },
};
const sessionSchema = {
    type: 'object', required: ['token', 'user', 'expiresIn'], additionalProperties: false,
    properties: { token: { type: 'string' }, user: userSchema, expiresIn: { type: 'integer' } },
};
const errorSchema = { type: 'object', required: ['error'], properties: { error: { type: 'string' } } };

/** Opt-in only: do not call for applications without accounts. No workflow dependency. */
export async function registerAccounts(app: FastifyInstance, database: Database | null,
    env: NodeJS.ProcessEnv = process.env) {
    const secret = env.JWT_SECRET;
    const factoryId = env.JWT_FACTORY_ID;
    if (!database || !secret?.trim() || !factoryId?.trim()) {
        throw new Error('Accounts require database bindings, JWT_SECRET and JWT_FACTORY_ID.');
    }
    const store = accountStore(database);
    await store.initialize();
    // Unknown accounts still perform password verification without hashing anew per request.
    const dummyHash = await hashPassword(randomBytes(32).toString('base64url'));
    const limits = accountLimits();
    const session = (account: { id: string; email: string }) => ({
        token: jwt.sign({ id: account.id, factoryId }, secret,
            { algorithm: 'HS256', subject: account.id, expiresIn }),
        user: { id: account.id, email: account.email }, expiresIn,
    });

    for (const action of ['register', 'login'] as const) {
        app.post<{ Body: { email: string; password: string } }>(`/auth/${action}`, {
            config: { public: true },
            bodyLimit: 8192,
            schema: {
                security: [], summary: action === 'register' ? 'Register an account' : 'Log in',
                body: {
                    type: 'object', required: ['email', 'password'], additionalProperties: false,
                    properties: {
                        email: { type: 'string', minLength: 3, maxLength: 254 },
                        password: { type: 'string', minLength: action === 'register' ? 12 : 1, maxLength: 1024 },
                    },
                },
                response: { [action === 'register' ? 201 : 200]: sessionSchema,
                    400: errorSchema, 401: errorSchema, 409: errorSchema, 429: errorSchema },
            },
        }, async (request, reply) => {
            reply.header('Cache-Control', 'no-store');
            const email = request.body.email.trim().toLowerCase();
            const password = request.body.password;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || Buffer.byteLength(password, 'utf8') > 1024) {
                return reply.code(400).send({ error: 'Invalid credentials format' });
            }
            const release = limits.acquire(email);
            if (!release) return reply.header('Retry-After', '600').code(429).send({ error: 'Too many attempts' });
            try {
                if (action === 'register') {
                    const account = await store.create(email, await hashPassword(password));
                    if (!account) return reply.code(409).send({ error: 'Account already exists' });
                    return reply.code(201).send(session(account));
                }
                const account = await store.find(email);
                const valid = await verifyPassword(password, account?.password_hash ?? dummyHash);
                if (!account || !valid) return reply.code(401).send({ error: 'Invalid email or password' });
                return session(account);
            } finally { release(); }
        });
    }
    app.get('/auth/me', {
        schema: { summary: 'Read the current account', response: { 200: userSchema, 401: errorSchema } },
    }, async (request, reply) => {
        reply.header('Cache-Control', 'no-store');
        if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(request.user!.id)) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
        const result = await database.pool.query<{ id: string; email: string }>(
            `SELECT id, email FROM ${database.schema}.app_accounts WHERE id = $1`, [request.user!.id]);
        if (!result.rows[0]) return reply.code(401).send({ error: 'Unauthorized' });
        return result.rows[0];
    });
}

