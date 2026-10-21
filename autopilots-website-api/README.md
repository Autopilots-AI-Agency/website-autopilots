# TypeScript Node API starter

This is application-owned source copied from Rumata's `node-api` starter v1.2.0.
Extend `app.ts` with the requested domain routes and tests. Keep route schemas beside
handlers; `/openapi.json` is generated from them. No domain data or account routes
are enabled by default. Reusable native registration/login is available as an opt-in
module. All new routes require a verified application JWT unless explicitly public;
apps without accounts mark their intended public routes with `config: { public: true }`
and `schema: { security: [] }`. Rumata gateway permissions and application-user
permissions are distinct.

Use Node 22.18+ (the development machine) or Node 24.12+ (production uses 24.21.0).
Run `pnpm install --frozen-lockfile`, `pnpm run check`, `pnpm test`, and `pnpm start`.
Use `pnpm run dev` for automatic backend restarts after TypeScript source edits;
production continues to use `pnpm start`. The service binds to `0.0.0.0:$PORT`
(default 8080). For Docker, use this folder as the build context and this folder's
`Dockerfile`. Keep `pnpm-lock.yaml` and `.dockerignore` in Git.

Node runs the `.ts` source directly, so edits need no compilation step. `pnpm run check`
runs strict TypeScript checking on source and tests; `pnpm test` uses Node's native
test runner. Run both after edits. Execution/watch mode alone does not check types.
Use explicit `.ts` imports and `import type` for types. The configuration enforces
erasable TypeScript syntax: use interfaces, type aliases and ordinary classes;
avoid enums, parameter properties, decorators and import aliases requiring a loader.
Docker checks source types during the build and removes development dependencies
before copying the app into the production image.

The scaffolder writes `rumata.backend.json` with repository-relative `directory`,
`context`, and `dockerfile`. Pass its `config` object to `configureBackendService`
with the current factory/project IDs. Review environment bindings, then commit/push
only with user or configured autosave authorization. Build and deploy explicitly.
This file records configuration; the platform does not automatically import it.
Its development configuration saves `setupCommand: ["pnpm", "install", "--frozen-lockfile"]` and
`command: ["pnpm", "run", "dev"]`. Rumata completes setup before each new backend
process, including after machine recreation. Setup failures block launch; hot
reload and checks of an unchanged running process do not rerun setup.

Enable database bindings in each required environment for persistence. `database.ts`
uses secret-backed DATABASE_URL, DATABASE_CA_CERT and DATABASE_SCHEMA with verified
TLS and a bounded pool. Add parameterized queries using the quoted `database.schema`;
never concatenate request values. Add schema migrations for the requested domain.
Keep `query_timeout` as a client setting; managed poolers reject `statement_timeout`
in the PostgreSQL startup packet.
`/health` checks the running HTTP service without opening a database connection.
Keep routine readiness and liveness probes independent of PostgreSQL so a sleeping
database stays asleep. Real application queries wake it through the activation
gateway. Return sanitized errors from application routes when a query fails.
For existing applications copied from this starter, replace the database query in
`/health` with the same `{ status: 'ready' }` response and rebuild the application;
updating the starter does not modify existing application source.
Do not put credentials in Docker build arguments, source, frontend variables or logs.

Logging uses Fastify's Pino dependency with one JSON object per stdout line, in both
development and production. Each entry includes `timestamp` (UTC), `level`, `service`,
`pid` and `message`; lifecycle and request entries also have a stable `event` name.
Use `app.log` outside handlers and `request.log` inside them so application events
carry the same `request_id` as the HTTP logs:

```ts
request.log.info({ event: 'item_created', item_id: item.id }, 'Item created');
app.log.error({ event: 'job_failed', err: error }, 'Background job failed');
```

Configure `SERVICE_NAME` for each backend (default `backend-api`), `LOG_LEVEL`
(`info` by default; `trace` includes every level), and `SLOW_HTTP_REQUEST_MS`
(default 2000). Invalid levels/thresholds fall back to these defaults.
Every request, including health checks, records `http_request_received` and one
`http_request_completed` event with method, route pattern, status/class, duration
in milliseconds, response size when available, and outcome. Slow requests, 5xx
responses and client disconnects are warnings; caught server failures also emit
an error event. A disconnected request has outcome `client_aborted` and log status
499. Valid `x-request-id` headers (1–128 letters, digits, dots, underscores or
hyphens) are preserved; other requests get UUIDs. Responses return `x-request-id`.
This ID is for correlation, never authorization.

Automatic logs exclude request/response bodies, headers, query values and path
parameter values. Error diagnostics retain type, code and stack frames, omitting
raw messages, causes and arbitrary properties that may contain SQL or credentials.
Common credential fields at the top level and one level below are redacted as a
second guard; this cannot sanitize arbitrary strings or deeply nested application
data. Log only selected non-sensitive fields with a fixed message. Use the logger
instead of `console.*` for searchable application events.

Run `node server.ts > backend.ndjson 2>&1` to capture logs locally. Container stdout
is collected by the runtime; development backends also forward stdout/stderr to the
development machine's container logs. Retention and rotation belong to the runtime
or your log collector, keeping this starter free of file management and vendor SDKs.
For example, filter a container's request completions with:

```sh
docker logs CONTAINER 2>&1 | jq -R 'fromjson? | select(.event == "http_request_completed")'
```

For private ETL orchestration, `workflows.ts` provides a server-only client with
`submit(workflowId, input, {async:true})` and `status(workflowRunId)`. First authorize
the application's user and derive tenant scope from the verified session. Configure
`WORKFLOW_GATEWAY_URL` from `provisionApiKey.workflowGatewayBaseUrl`
and bind its returned Project secret to `WORKFLOW_API_KEY`. Publish the exact
workflow version with `publishIntegrationWorkflow`; this keeps execution private.
Use group permissions for workflow execution and reading results to poll. A 202 response means accepted,
not completed. Do not retry a submission blindly after a timeout; use application
job IDs and idempotent extraction/loading. The client never follows redirects.

Submissions inherit the saved workflow response mode, defaulting to sync when it
is unset. Use `{async:true}` explicitly
for background jobs that should return a run ID for polling. Set the workflow
trigger's `responseMode:{literal:'async'}` for those jobs too, so its saved default
agrees with the application. Request overrides take precedence over the saved default.

Both submission and status reads return `{ workflowRunId, status, result?, error? }`.
HTTP 202 means accepted, not completed; HTTP 200 from status can still mean running.
Only `status === 'succeeded'` proves workflow success. A terminal file-producing
agent returns `result:{output:<application payload>,files:[...]}`; without files its
result is the application payload directly. The configured agent output schema
applies to `output`, not to the runtime attachment wrapper. Keep the raw result
for attachments and use the typed helper for application fields:

```ts
import { workflowOutput } from './workflows.ts';
type JobOutput = { summary: string };
const submitted = await workflows.submit<JobOutput>(workflowId, input);
// Persist submitted.workflowRunId on the owned application job before returning 202.
const run = await workflows.status<JobOutput>(submitted.workflowRunId);
if (run.status === 'succeeded') {
  const output = workflowOutput(run.result);
  // Validate output, then persist output.summary and mark the job applied atomically.
}
```

Application completion must survive closing the browser and backend restarts.
Persist job ownership, resource ID, workflowRunId and an application-completion
marker in the database. Use a workflow persistence step/callback or the starter's
`startWorkflowReconciler` in `workflow-reconciler.ts` to resume unapplied jobs on
startup and periodically. Its `loadPending(limit)` reads persisted jobs;
`reconcile(job)` reads status of the EXISTING run and applies terminal results in
an idempotent transaction. Use a row lock/application marker so concurrent polling
and workers cannot apply twice. Record failures per job, continue other jobs, and
retry transient status/storage failures without resubmitting paid generation.
Call `await reconciler.stop()` before closing the database pool. Order pending
jobs fairly (e.g. by last reconciliation attempt) so failed jobs do not starve others.

Owned resource/library reads must rediscover pending jobs from the database;
`?job=`, browser storage and an open polling page are not sources of truth.
A successful run with unapplied output is recoverable work, not a reason to generate
again. Verify generation → persisted completion → readable output, including leaving,
reopening through the library without query parameters, and backend restart.

For workflow callbacks, issue a separate backend-scoped key and use its Project
secret in the workflow HTTP header. The gateway strips the credential and supplies
the verified `x-rumata-api-key-id`. Bind that key's metadata ID to
`WORKFLOW_CALLBACK_KEY_ID` and require an exact match on internal extraction/loading
routes, in addition to validating the job and tenant. Reject absent/mismatched IDs.
Only trust this identity behind the managed gateway; application login alone must
not grant access to these internal routes.

The Dockerfile uses Node 24.21.0 and runs as UID 1000. No startup override is required.
If explicitly choosing native builds, keep source runtimeVersion/buildCommand/
startCommand aligned with the Dockerfile; native builds generate their own recipe
and do not consume this Dockerfile. Existing services need not be migrated.

## Optional native accounts

Only enable accounts when the product needs them. In `server.ts`, use:

```ts
app = await createApp({ database, logger, accounts: true });
```

Set `database:true` in both managed-service environments and bind `JWT_SECRET` and
`JWT_FACTORY_ID` as described below. Missing bindings fail startup before account
DDL. The module creates `app_accounts` in the existing factory schema using an
idempotent migration. Applications without opt-in create no account tables and
expose no `/auth/*` endpoints. Existing authentication should be reused; this module
does not migrate workflow accounts or their password hashes.

| Endpoint | Request | Result |
| --- | --- | --- |
| `POST /auth/register` | `{email, password}` | 201 `{token, user: {id, email}, expiresIn: 3600}` |
| `POST /auth/login` | `{email, password}` | 200 with the same session shape |
| `GET /auth/me` | `Authorization: Bearer <token>` | 200 `{id, email}` for an existing account |

Registration requires 12 or more characters; all passwords are limited to 1024 UTF-8
bytes. Emails are trimmed and lowercased. A unique database constraint handles
concurrent duplicate registration (409). Passwords use randomly salted scrypt hashes
and constant-time comparison. Wrong passwords and missing accounts return the same
401 response and both perform password verification. Responses containing sessions
use `Cache-Control: no-store`; passwords, hashes and tokens must never be logged.
Sessions are HS256 JWTs signed with the existing factory key, with matching `id`/`sub`,
`factoryId` and a one-hour expiration. The frontend sends the token to protected
backend endpoints; it does not call registration/login workflows.

The module limits concurrent password operations to two and allows twenty attempts
per normalized email per ten minutes, shared across registration and login. Excess
requests return 429. These bounded admission limits are per process and reset on
restart; a public or multi-replica deployment needs shared ingress/database rate
limiting too. Registration does not verify email ownership. Password recovery,
email verification, refresh tokens and server-side logout/revocation are outside
this module. Removing a client token logs that client out; issued tokens remain
valid until expiration. Domain routes still enforce ownership and any account
status/revocation policy; `/auth/me` additionally checks that the account exists.

Use `request.user!.id` for every private read/write and authorize delegated jobs
before submitting private workflows. Do not trust body/query user IDs. Keep
application-specific data in separate tables referencing `app_accounts.id` as needed.

Run the PostgreSQL integration test against a disposable database:

```sh
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5432/test pnpm test
```

It creates and removes only a unique test schema, exercising real HTTP registration,
login, duplicate races, password rejection, signed sessions, restart persistence,
rate limits and log redaction. Without `TEST_DATABASE_URL`, that integration test is
skipped; the remaining tests still cover disabled accounts, required configuration,
password helpers and JWT rejection.

## Application authentication

The global `onRequest` guard in `auth.ts` calls `jwt.verify` with `algorithms: ['HS256']`
before parsing private request bodies or running handlers. It requires an expiration
and a nonempty user `id` (or matching `sub`), and rejects invalid signatures, expired
sessions, unsupported algorithms and inconsistent identities. Missing `JWT_SECRET`
fails closed with 503. Invalid/missing credentials return 401.

Select `FACTORY_JWT_SECRET_<factory-id>` via Project Secrets and bind it as `JWT_SECRET`
in **both development and production**. The scaffolder writes these references when
using `factories/<factory-id>/backend`; apply the configuration to the managed service.
Bind `JWT_FACTORY_ID` to the factory ID too. This is the existing key used by Rumata
user-login/user-register and issue-factory-jwt; never create a replacement key, print
its value, or use the platform JWT secret. No signing key belongs in frontend code.

Health and OpenAPI are explicitly public. Mark only intentional public endpoints
(e.g. credential-validated login/registration) with `config: { public: true }` and
`schema: { security: [] }`. Every protected route, including workflow submissions,
uses `request.user!.id` for parameterized ownership checks. Never trust a client user
ID or `jwt.decode` as authentication. Keep the guard when extending this starter.
Test both owner and other-user access, and missing, forged, expired and wrong-key tokens.

