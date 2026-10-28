import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import type { TestContext } from 'node:test';
import type { LogEntry } from './helpers.ts';

function launch(t: TestContext, overrides: NodeJS.ProcessEnv = {}, args = ['server.ts'], cwd: string | URL = new URL('..', import.meta.url)) {
    const child = spawn(process.execPath, args, {
        cwd,
        env: { ...process.env, DATABASE_URL: '', PORT: '0', SERVICE_NAME: 'lifecycle-test', LOG_LEVEL: 'info', ...overrides },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    const logs: LogEntry[] = [];
    let pending = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
        pending += chunk;
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';
        for (const line of lines) {
            // Node's watch supervisor also writes human-readable restart messages.
            if (!line.startsWith('{')) continue;
            const log: LogEntry = JSON.parse(line);
            logs.push(log);
            if (log.event) child.emit(log.event, log);
        }
    });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const exited = once(child, 'close');
    t.after(async () => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        const deadline = setTimeout(() => child.kill('SIGKILL'), 2000);
        await exited;
        clearTimeout(deadline);
    });
    return { child, logs, exited, stderr: () => stderr };
}

test('real server emits startup, request and graceful shutdown JSON to stdout', { timeout: 10000 }, async t => {
    const { child, logs, exited, stderr } = launch(t);
    const [ready] = await once(child, 'server_started');
    const url = new URL(ready.address);
    url.hostname = '127.0.0.1';
    url.pathname = '/health';
    const response = await fetch(url, { headers: { 'x-request-id': 'lifecycle-request' } });
    assert.deepEqual(await response.json(), { status: 'ready' });
    assert.equal(response.headers.get('x-request-id'), 'lifecycle-request');
    child.kill('SIGTERM');
    assert.deepEqual(await exited, [0, null]);
    assert.equal(stderr(), '');
    for (const event of ['server_started', 'http_request_received', 'http_request_completed', 'server_stopping', 'server_stopped']) {
        assert.equal(logs.filter(log => log.event === event).length, 1, event);
    }
    assert.ok(logs.every(log => log.service === 'lifecycle-test'));
    assert.equal(logs.find(log => log.event === 'server_stopping')?.signal, 'SIGTERM');
});

test('startup failures exit nonzero with structured diagnostics and no connection secret', { timeout: 10000 }, async t => {
    const { logs, exited, stderr } = launch(t, { DATABASE_URL: 'postgres://owner:STARTUP_SECRET@db',
        DATABASE_CA_CERT: '', DATABASE_SCHEMA: '' });
    assert.deepEqual(await exited, [1, null]);
    assert.equal(stderr(), '');
    assert.equal(logs[0].event, 'server_startup_failed');
    assert.equal(logs[0].level, 'fatal');
    assert.ok(logs[0].err?.stack);
    assert.ok(!JSON.stringify(logs).includes('STARTUP_SECRET'));
});

test('uncaught failures emit a fatal event and preserve the nonzero process exit', { timeout: 10000 }, async t => {
    const { logs, exited } = launch(t, {}, ['--input-type=module', '--eval',
        "await import('./server.ts'); setImmediate(() => { throw new Error('Intentional test failure'); });"]);
    assert.deepEqual(await exited, [1, null]);
    const failure = logs.find(log => log.event === 'process_failed');
    assert.ok(failure);
    assert.equal(failure.level, 'fatal');
    assert.equal(failure.origin, 'uncaughtException');
    assert.ok(failure.err?.stack);
});
