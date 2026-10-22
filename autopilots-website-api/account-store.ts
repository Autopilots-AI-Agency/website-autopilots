import { randomUUID } from 'node:crypto';
import type { Database } from './database.ts';

export interface Account { id: string; email: string; password_hash: string }

/** The factory schema is already quoted by connectDatabase; values are always parameters. */
export function accountStore(database: Database) {
    const table = `${database.schema}.app_accounts`;
    return {
        async initialize() {
            await database.pool.query(`CREATE TABLE IF NOT EXISTS ${table} (
                id uuid PRIMARY KEY,
                email text NOT NULL UNIQUE CHECK (email = lower(email)),
                password_hash text NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now()
            )`);
        },
        async create(email: string, passwordHash: string): Promise<Account | null> {
            const result = await database.pool.query<Account>(`INSERT INTO ${table} (id, email, password_hash)
                VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id, email, password_hash`,
            [randomUUID(), email, passwordHash]);
            return result.rows[0] ?? null;
        },
        async find(email: string): Promise<Account | null> {
            const result = await database.pool.query<Account>(
                `SELECT id, email, password_hash FROM ${table} WHERE email = $1`, [email]);
            return result.rows[0] ?? null;
        },
    };
}
