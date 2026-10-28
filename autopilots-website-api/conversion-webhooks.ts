import type { FastifyInstance } from 'fastify';
import type { Database } from './database.ts';
import { checksum, ensureLegacyStorage } from './legacy-store.ts';
import { clean, hmac, safeEqualHex, verifyStripeSignature } from '../autopilots-website/netlify/functions/_shared/security.mjs';

/** Tracking-only compatibility endpoints: no payment fulfillment or provider writes. */
export async function registerConversionWebhooks(app: FastifyInstance, db: Database | null, env: NodeJS.ProcessEnv) {
    let ready: Promise<unknown> | undefined;
    const ensure = () => ready ??= ensureLegacyStorage(db!).catch(error => { ready = undefined; throw error; });
    await app.register(async scoped => {
        scoped.removeAllContentTypeParsers();
        scoped.addContentTypeParser('*', { parseAs: 'buffer' }, (_request, body, done) => done(null, body));
        for (const kind of ['booking', 'stripe'] as const) scoped.post(`/api/webhooks/${kind}`, {
            bodyLimit: 1048576, config: { public: true },
            schema: { security: [], summary: 'Receive a signed conversion tracking event' },
        }, async (request, reply) => {
            reply.header('cache-control', 'no-store').header('x-content-type-options', 'nosniff');
            if (!db || env.CONVERSION_WEBHOOKS_ENABLED !== 'true') return reply.code(503).send({ ok: false });
            const raw = Buffer.isBuffer(request.body) ? request.body.toString('utf8') : '';
            const signature = kind === 'booking'
                ? request.headers['x-autopilots-signature'] ?? request.headers['x-ghl-signature']
                : request.headers['stripe-signature'];
            const secret = kind === 'booking' ? env.GHL_BOOKING_WEBHOOK_SECRET : env.STRIPE_WEBHOOK_SECRET;
            const verified = secret && typeof signature === 'string' && signature.length <= 4096 && (kind === 'booking'
                ? safeEqualHex(hmac(secret, raw), clean(signature, 128))
                : verifyStripeSignature(raw, signature, secret));
            // Authentication precedes database/idempotency writes: a forged first
            // delivery must not poison the receipt of a later valid delivery.
            if (!verified) return reply.code(401).send({ ok: false });
            let event: Record<string, any>;
            try { event = JSON.parse(raw); } catch { return reply.code(400).send({ ok: false }); }
            if (!event || typeof event !== 'object' || Array.isArray(event)) return reply.code(422).send({ ok: false });
            const id = kind === 'booking' ? event.id ?? event.appointmentId ?? event.appointment?.id : event.id;
            if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(id)) return reply.code(422).send({ ok: false });
            if (kind === 'stripe' && !['checkout.session.completed', 'payment_intent.succeeded'].includes(event.type)) return { received: true };
            await ensure();
            const recordKey = `${kind === 'booking' ? 'booking' : 'payment'}/${id}`;
            const payload = kind === 'booking'
                ? { type: 'appointment_completed', id, status: clean(event.status ?? event.appointment?.status, 40), receivedAt: new Date().toISOString() }
                : { type: 'payment_completed', eventType: event.type, objectId: clean(event.data?.object?.id, 120), receivedAt: new Date().toISOString() };
            const json = JSON.stringify(payload), commandKey = checksum(`conversion:${recordKey}`);
            const connection = await db.pool.connect();
            try {
                await connection.query('BEGIN');
                const inserted = await connection.query(`INSERT INTO ${db.schema}.website_legacy_records(store_name,record_key,payload,content_sha256)
                    VALUES('autopilots-conversions',$1,$2::jsonb,$3) ON CONFLICT(store_name,record_key) DO NOTHING RETURNING record_key`, [recordKey, json, checksum(json)]);
                const duplicate = !inserted.rows.length;
                const response = kind === 'booking' ? { ok: true, ...(duplicate ? { duplicate: true } : {}) } : { received: true, ...(duplicate ? { duplicate: true } : {}) };
                await connection.query(`INSERT INTO ${db.schema}.website_campaign_commands
                    (command_key,input_sha256,state,risk,usage_cents,response_status,response_body,response_headers,finished_at)
                    VALUES($1,$2,'completed','R1',0,200,$3,'{}'::jsonb,now()) ON CONFLICT(command_key) DO NOTHING`,
                [commandKey, checksum(raw), JSON.stringify(response)]);
                await connection.query('COMMIT');
                request.log.info({ event: 'conversion_received', kind, command_key: commandKey, duplicate, risk: 'R1', usage_cents: 0 }, 'Signed conversion persisted');
                return response;
            } catch (error) { await connection.query('ROLLBACK'); throw error; }
            finally { connection.release(); }
        });
    });
}
