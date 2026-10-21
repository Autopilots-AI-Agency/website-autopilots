import test from 'node:test';
import assert from 'node:assert/strict';
import { startWorkflowReconciler } from '../workflow-reconciler.ts';

test('recovers persisted completion without a browser and resumes after restart', async () => {
  const jobs = [{ runId: 'existing-paid-run', applied: false }];
  let writes = 0;
  const options = {
    loadPending: async () => jobs.filter(job => !job.applied),
    reconcile: async (job: typeof jobs[number]) => { if (!job.applied) { job.applied = true; writes++; } },
    onError: (error: unknown) => { throw error; },
  };
  const first = startWorkflowReconciler(options);
  await first.runOnce();
  await first.stop();
  const restarted = startWorkflowReconciler(options);
  await restarted.runOnce();
  await restarted.stop();
  assert.equal(writes, 1);
  assert.equal(jobs[0].runId, 'existing-paid-run');
});

test('isolates transient failures, retries stored jobs, and prevents overlapping batches', async () => {
  const errors: unknown[] = [];
  const applied: number[] = [];
  let fail = true;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let loads = 0;
  const worker = startWorkflowReconciler({
    loadPending: async limit => { assert.equal(limit, 2); loads++; await gate; return [1, 2].filter(id => !applied.includes(id)); },
    reconcile: async id => { if (id === 1 && fail) throw new Error('Temporary storage failure'); applied.push(id); },
    onError: error => { errors.push(error); }, batchSize: 2,
  });
  const one = worker.runOnce();
  const two = worker.runOnce();
  assert.equal(one, two);
  release();
  await one;
  assert.equal(loads, 1);
  assert.deepEqual(applied, [2]);
  assert.equal(errors.length, 1);
  fail = false;
  await worker.runOnce();
  await worker.stop();
  assert.deepEqual(applied, [2, 1]);
});

