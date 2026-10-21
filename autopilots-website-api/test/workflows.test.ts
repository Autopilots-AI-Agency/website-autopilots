import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflowClient, workflowOutput } from '../workflows.ts';
import type { WorkflowResult } from '../workflows.ts';
const id = '11111111-1111-4111-8111-111111111111';
test('submits once using server credentials and returns an accepted run for polling', async () => {
  const calls: (RequestInit & { url: string })[] = [];
  const client = createWorkflowClient({ baseUrl: 'https://gateway.example', apiKey: 'private-key', fetchImpl: async (url, options) => {
    calls.push({ url: String(url), ...options });
    return Response.json({ workflowRunId: id, status: 'running', statusUrl: `/wf/runs/${id}` }, { status: 202 });
  } });
  assert.equal((await client.submit(id, { jobId: 'job' }, { async: true })).accepted, true);
  await client.status(id);
  assert.equal(calls[0].url, `https://gateway.example/wf/${id}/trigger?mode=async`);
  assert.equal(new Headers(calls[0].headers).get('rumata-api-key'), 'private-key');
  assert.equal(calls[0].redirect, 'error');
  assert.ok(typeof calls[0].body === 'string');
  assert.deepEqual(JSON.parse(calls[0].body), { input: { jobId: 'job' } });
  assert.equal(calls[1].url, `https://gateway.example/wf/runs/${id}`);
  assert.throws(() => client.status('https://attacker.example'), /valid workflow run ID/);
});

test('reads the same typed result envelope from sync completion and async status polling', async () => {
  const responses = [
    Response.json({ workflowRunId: id, status: 'succeeded', result: { summary: 'Completed' } }),
    Response.json({ workflowRunId: id, status: 'running', statusUrl: `/wf/runs/${id}` }, { status: 202 }),
    Response.json({ workflowRunId: id, status: 'running' }),
    Response.json({ workflowRunId: id, status: 'succeeded', result: { summary: 'Completed' } }),
  ];
  const client = createWorkflowClient({ baseUrl: 'https://gateway.example', apiKey: 'key',
    fetchImpl: async () => responses.shift()! });
  const sync = await client.submit<{ summary: string }>(id, {}, { async: false });
  assert.equal(sync.accepted, false);
  assert.equal(workflowOutput(sync.result)?.summary, 'Completed');
  const submitted = await client.submit(id, {}, { async: true });
  assert.equal(submitted.accepted, true);
  assert.equal(submitted.workflowRunId, id);
  const pending = await client.status(submitted.workflowRunId);
  assert.equal(pending.accepted, false); // HTTP 200 is not completion; inspect status.
  assert.equal(pending.status, 'running');
  const completed = await client.status<{ summary: string }>(submitted.workflowRunId);
  assert.deepEqual(completed, sync);
});

test('retains terminal failure and cancellation states even on HTTP 200', async () => {
  for (const status of ['failed', 'cancelled']) {
    const client = createWorkflowClient({ baseUrl: 'https://gateway.example', apiKey: 'key',
      fetchImpl: async () => Response.json({ workflowRunId: id, status, error: { message: 'Job failed' } }) });
    const run = await client.status(id);
    assert.equal(run.status, status);
    assert.deepEqual(run.error, { message: 'Job failed' });
    assert.equal(run.result, undefined);
  }
});

test('rejects guessed fields and malformed gateway responses', async () => {
  for (const value of [null, [], { runId: id, output: {} }, { workflowRunId: id },
    { workflowRunId: id, status: 'complete' }, { workflowRunId: 'invalid', status: 'running' }]) {
    const client = createWorkflowClient({ baseUrl: 'https://gateway.example', apiKey: 'key',
      fetchImpl: async () => Response.json(value) });
    await assert.rejects(client.status(id), /invalid/);
  }
});

// Type checking should catch the exact field guesses seen in live generated applications.
function checkWorkflowContract(run: WorkflowResult<{ summary: string }>) {
  const summary: string | undefined = workflowOutput(run.result)?.summary;
  // @ts-expect-error The run ID is workflowRunId, not runId.
  void run.runId;
  // @ts-expect-error Application output is nested under result.
  void run.output;
  // @ts-expect-error Application fields are not flattened onto the envelope.
  void run.summary;
  return summary;
}
void checkWorkflowContract;
test('does not retry or disclose a credential from a failing request', async () => {
  let calls = 0;
  const client = createWorkflowClient({ baseUrl: 'https://gateway.example', apiKey: 'private-key', fetchImpl: async () => {
    calls++; throw new Error('private-key');
  } });
  await assert.rejects(client.submit(id, {}), error => error instanceof Error
    && !error.message.includes('private-key') && /could not be confirmed/.test(error.message));
  assert.equal(calls, 1);
});
test('reports authorization and quota status without reflecting response bodies', async () => {
  for (const status of [401, 403, 429]) {
    const client = createWorkflowClient({ baseUrl: 'https://gateway.example', apiKey: 'key', fetchImpl: async () => new Response(null, { status }) });
    await assert.rejects(client.submit(id, {}), error => error instanceof Error && 'status' in error && error.status === status);
  }
});


test('preserves attached files and unwraps only the runtime file-result contract', async () => {
  const output = { pages: [{ text: 'Story' }] };
  const result = { output, files: [{ path: 'books/page.png', contentType: 'image/png' }] };
  const client = createWorkflowClient({ baseUrl: 'https://gateway.example', apiKey: 'key',
    fetchImpl: async () => Response.json({ workflowRunId: id, status: 'succeeded', result }) });
  const run = await client.status<typeof output>(id);
  assert.deepEqual(workflowOutput(run.result), output);
  assert.deepEqual(run.result, result);
  assert.deepEqual(workflowOutput(output), output);
  assert.deepEqual(workflowOutput<{ output: string }>({ output: 'ordinary field' }), { output: 'ordinary field' });
  assert.equal(workflowOutput(undefined), undefined);
});

test('submissions inherit the workflow default and preserve explicit response modes', async () => {
  let called = '';
  const client = createWorkflowClient({ baseUrl: 'https://gateway.example', apiKey: 'key',
    fetchImpl: async url => { called = String(url); return Response.json({ workflowRunId: id, status: 'succeeded', result: {} }); } });
  await client.submit(id, {});
  assert.equal(called, `https://gateway.example/wf/${id}/trigger`);
  await client.submit(id, {}, { async: true });
  assert.equal(called, `https://gateway.example/wf/${id}/trigger?mode=async`);
  await client.submit(id, {}, { async: false });
  assert.equal(called, `https://gateway.example/wf/${id}/trigger?mode=sync`);
});

