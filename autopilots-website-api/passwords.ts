import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// OWASP's 32 MiB scrypt profile. Explicit headroom avoids Node's 32 MiB default
// rejecting the allocation. Parameters are fixed by the version, never by input.
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const validPassword = (value: unknown): value is string => typeof value === 'string'
    && value.length > 0 && Buffer.byteLength(value, 'utf8') <= 1024;

function derive(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, 64, options, (error, key) => error ? reject(error) : resolve(key));
    });
}

/** Store only this salted hash in the account table. Apply product password policy in the route. */
export async function hashPassword(password: string): Promise<string> {
    if (!validPassword(password)) throw new Error('Invalid password length');
    const salt = randomBytes(16);
    const key = await derive(password, salt);
    return `scrypt-v1$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

/** Malformed hashes and wrong passwords fail closed; crypto failures still propagate. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (!validPassword(password) || typeof storedHash !== 'string') return false;
    const match = /^scrypt-v1\$([A-Za-z0-9_-]{22})\$([A-Za-z0-9_-]{86})$/.exec(storedHash);
    if (!match) return false;
    const salt = Buffer.from(match[1], 'base64url'), expected = Buffer.from(match[2], 'base64url');
    if (salt.toString('base64url') !== match[1] || expected.toString('base64url') !== match[2]) return false;
    return timingSafeEqual(expected, await derive(password, salt));
}

