import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Database } from './database.ts';
import { beginCampaignCommand, ensureLegacyStorage, legacyStore } from './legacy-store.ts';
import { withLegacyStores } from '../autopilots-website/netlify/functions/_shared/store-context.mjs';
import funnelLead from '../autopilots-website/netlify/functions/funnel-lead.mjs';
import funnelEvent from '../autopilots-website/netlify/functions/funnel-event.mjs';
import funnelAdmin from '../autopilots-website/netlify/functions/funnel-admin.mjs';

const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const campaignContextVersion = 'rumata-campaign-migration-2026-10-28.1';
const routes = [
    { method: 'POST', url: '/api/funnel-lead', handler: funnelLead, limit: 24000, risk: 'R3' },
    { method: 'POST', url: '/api/funnel-event', handler: funnelEvent, limit: 12000, risk: 'R1' },
    { method: 'GET', url: '/backend/funnel-autobedrijven/', handler: funnelAdmin, limit: 0, risk: 'R1' },
] as const;

/** Preserve the locked funnel's validation, CRM payloads and admin access checks.
 * Only its persistence is replaced. No Netlify credentials are needed on Rumata.
 */
export async function registerCampaign(app: FastifyInstance, db: Database | null, env: NodeJS.ProcessEnv) {
    let ready: Promise<unknown> | undefined;
    const ensure = () => ready ??= ensureLegacyStorage(db!).catch(error => { ready = undefined; throw error; });
    await app.register(async scoped => {
        // Keep request bytes intact; the legacy handlers do their own JSON parsing.
        scoped.removeAllContentTypeParsers();
        scoped.addContentTypeParser('*', { parseAs: 'buffer' }, (_request, body, done) => done(null, body));
        for (const route of routes) scoped.route({
            method: route.method, url: route.url,
            bodyLimit: Math.max(route.limit, 1),
            config: { public: true },
            schema: { security: [], summary: 'Website campaign compatibility endpoint' },
            handler: async (request, reply) => {
                // The owner deferred the private dashboard, not the public funnel.
                // Reject before storage/auth work even if the old credentials exist.
                if (route.method === 'GET' && env.CAMPAIGN_ADMIN_ENABLED !== 'true') {
                    return reply.code(404).send({ error: 'Not found' });
                }
                if (!db || env.CAMPAIGN_ENABLED !== 'true') return reply.code(503).send({ ok: false, error: 'Campaign unavailable' });
                if (route.url === '/api/funnel-lead' && (env.CAMPAIGN_CRM_ENABLED !== 'true' || env.CAMPAIGN_APPROVAL_VERSION !== campaignContextVersion)) {
                    return reply.code(503).send({ ok: false, error: 'Campaign CRM not activated' });
                }
                if (route.method === 'POST' && request.headers.origin && request.headers.origin !== (env.WEBSITE_ORIGIN ?? 'https://auto-pilots.io')) {
                    return reply.code(403).send({ ok: false, error: 'Origin not allowed' });
                }
                const raw = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
                const headers = new Headers();
                for (const [key, value] of Object.entries(request.headers)) {
                    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
                }
                const webRequest = new Request(`${env.WEBSITE_ORIGIN ?? 'https://auto-pilots.io'}${route.url}`, {
                    method: route.method, headers, ...(route.method === 'POST' ? { body: new Uint8Array(raw) } : {}),
                });
                // Authenticate the existing private dashboard before any data access.
                if (route.method === 'GET') {
                    const response: Response = await withLegacyStores(() => ({
                        list: async (options: { prefix?: string }) => { await ensure(); return legacyStore(db, 'autopilots-funnel').list(options); },
                        get: async (key: string, options: { type?: string }) => legacyStore(db, 'autopilots-funnel').get(key, options),
                    }), () => route.handler(webRequest));
                    response.headers.forEach((value, key) => reply.header(key, value));
                    return reply.code(response.status).send(await response.text());
                }
                await ensure();
                const inputHash = hash(raw);
                const supplied = request.headers['idempotency-key'];
                if (supplied !== undefined && (typeof supplied !== 'string' || !/^[a-zA-Z0-9_-]{12,128}$/.test(supplied))) {
                    return reply.code(400).send({ ok: false, error: 'Invalid idempotency key' });
                }
                // Old lead forms do not supply keys. Deduplicate identical submissions.
                // Identical page views may be genuine separate visits, so telemetry
                // only deduplicates explicit client keys, not every identical payload.
                const fallbackKey = route.risk === 'R3' ? inputHash : randomUUID();
                const commandKey = hash(`${route.url}:${supplied ?? fallbackKey}`);
                const command = await beginCampaignCommand(db, commandKey, inputHash, route.risk, route.risk === 'R3' ? campaignContextVersion : null);
                if (!command.acquired) {
                    const previous = command.previous;
                    if (!previous || previous.input_sha256 !== inputHash) return reply.code(409).send({ ok: false, error: 'Idempotency conflict' });
                    if (previous.state !== 'completed') return reply.code(409).send({ ok: false, error: 'Previous outcome requires reconciliation' });
                    for (const [key, value] of Object.entries(previous.response_headers ?? {})) reply.header(key, String(value));
                    return reply.code(previous.response_status).send(previous.response_body);
                }
                try {
                    const response: Response = await withLegacyStores((name: string) => legacyStore(db, name), () => route.handler(webRequest));
                    const body = await response.text();
                    const responseHeaders = Object.fromEntries(response.headers.entries());
                    await db.pool.query(`UPDATE ${db.schema}.website_campaign_commands SET state='completed',response_status=$2,
                        response_body=$3,response_headers=$4::jsonb,finished_at=now() WHERE command_key=$1`,
                    [commandKey, response.status, body, JSON.stringify(responseHeaders)]);
                    request.log.info({ event: 'campaign_command_completed', command_key: commandKey, risk: route.risk, usage_cents: 0, http_status_code: response.status }, 'Campaign command completed');
                    response.headers.forEach((value, key) => reply.header(key, value));
                    return reply.code(response.status).send(body);
                } catch (error) {
                    // A timeout after CRM acceptance must never cause an automatic retry.
                    await db.pool.query(`UPDATE ${db.schema}.website_campaign_commands SET state='unknown',finished_at=now() WHERE command_key=$1`, [commandKey]).catch(() => {});
                    throw error;
                }
            },
        });
    });
}
