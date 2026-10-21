import pg from 'pg';
import { createLogger } from './logger.ts';
import type { FastifyBaseLogger } from 'fastify';

export interface Database {
    pool: pg.Pool;
    schema: string;
}

export function databaseOptions(env: NodeJS.ProcessEnv) {
    if (!env.DATABASE_URL || !env.DATABASE_CA_CERT || !env.DATABASE_SCHEMA) {
        throw new Error('Enable the project database binding before using database routes.');
    }
    const url = new URL(env.DATABASE_URL);
    // URL SSL options override pg's explicit TLS configuration; trust only the binding's CA.
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
    return {
        connectionString: url.toString(),
        ssl: { ca: env.DATABASE_CA_CERT, rejectUnauthorized: true },
        max: 3,
        connectionTimeoutMillis: 15000,
        // Poolers reject statement_timeout in the PostgreSQL startup packet.
        // Bound client queries without sending unsupported startup parameters.
        query_timeout: 15000,
    };
}

export function connectDatabase(env: NodeJS.ProcessEnv = process.env, logger: FastifyBaseLogger = createLogger({ env })): Database {
    const pool = new pg.Pool(databaseOptions(env));
    // Factory schemas contain UUIDs and must be quoted. Parameterize query values separately.
    const schema = `"${env.DATABASE_SCHEMA!.replaceAll('"', '""')}"`;
    pool.on('error', error => logger.error({ event: 'database_connection_failed', err: error }, 'Idle database connection failed'));
    return { pool, schema };
}

