interface ReconcilerOptions<Job> {
  /** Read unfinished jobs with stored workflow run IDs from durable storage. */
  loadPending: (limit: number) => Promise<Job[]>;
  /** Read existing run status and apply completion idempotently; never resubmit. */
  reconcile: (job: Job) => Promise<void>;
  onError: (error: unknown, job?: Job) => void;
  intervalMs?: number;
  batchSize?: number;
}

/** Restartable polling of persisted jobs, independent of browser requests. */
export function startWorkflowReconciler<Job>({
  loadPending, reconcile, onError, intervalMs = 5000, batchSize = 25,
}: ReconcilerOptions<Job>) {
  if (!Number.isFinite(intervalMs) || intervalMs < 1 || !Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('Positive reconciliation interval and batch size are required.');
  }
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: Promise<void> | undefined;
  const runOnce = (): Promise<void> => {
    if (stopped) return Promise.resolve();
    if (active) return active;
    active = (async () => {
      try {
        for (const job of await loadPending(batchSize)) {
          if (stopped) break;
          try { await reconcile(job); } catch (error) { onError(error, job); }
        }
      } catch (error) { onError(error); }
    })().finally(() => { active = undefined; });
    return active;
  };
  const tick = async () => {
    await runOnce();
    if (!stopped) {
      timer = setTimeout(() => { void tick(); }, intervalMs);
      timer.unref();
    }
  };
  void tick();
  return {
    runOnce,
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      await active;
    },
  };
}

