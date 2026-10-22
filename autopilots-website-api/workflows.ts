interface WorkflowClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface SubmissionOptions {
  async?: boolean;
  runName?: string;
}

export type WorkflowStatus = 'queued' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'cancelled';

/** The gateway envelope is distinct from the workflow's application result. */
export interface WorkflowResult<T = unknown> {
  workflowRunId: string;
  status: WorkflowStatus;
  accepted: boolean;
  statusUrl?: string;
  result?: T | WorkflowFileResult<T>;
  error?: unknown;
}

/** File-producing agents preserve their structured answer inside output. */
export interface WorkflowFileResult<T> {
  output: T;
  files: Record<string, unknown>[];
}

/** Read the application payload without discarding the raw result or its files. */
export function workflowOutput<T>(result: T | WorkflowFileResult<T> | undefined): T | undefined {
  if (result && typeof result === 'object' && Object.hasOwn(result, 'output')
    && 'files' in result && Array.isArray(result.files)) {
    return (result as WorkflowFileResult<T>).output;
  }
  return result as T | undefined;
}

/** Server-only client. Call after authorizing the application's current user. */
export function createWorkflowClient({
  baseUrl = process.env.WORKFLOW_GATEWAY_URL,
  apiKey = process.env.WORKFLOW_API_KEY,
  timeoutMs = 30_000,
  fetchImpl = fetch,
}: WorkflowClientOptions = {}) {
  if (!baseUrl || !apiKey) throw new Error('Workflow gateway and API key bindings are required.');
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('Invalid workflow gateway URL.');
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const statuses = new Set(['queued', 'running', 'waiting', 'succeeded', 'failed', 'cancelled']);
  const request = async <T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<WorkflowResult<T>> => {
    const url = new URL(base.toString().replace(/\/$/, '') + path);
    let response;
    try {
      response = await fetchImpl(url, {
        method, redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'rumata-api-key': apiKey, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      // No raw transport error: it may contain request credentials. A timeout may
      // occur after admission, so applications must not automatically resubmit.
      throw new Error('Workflow request could not be confirmed. Check the job before retrying.');
    }
    if (!response.ok) {
      throw Object.assign(new Error(`Workflow gateway returned HTTP ${response.status}.`), { status: response.status });
    }
    let result: unknown;
    try { result = await response.json(); } catch { throw new Error('Workflow gateway returned an invalid response.'); }
    if (typeof result !== 'object' || result === null || Array.isArray(result)) {
      throw new Error('Workflow gateway returned an invalid response.');
    }
    const envelope = result as Record<string, unknown>;
    if (typeof envelope.workflowRunId !== 'string' || !uuid.test(envelope.workflowRunId)
      || typeof envelope.status !== 'string' || !statuses.has(envelope.status)) {
      throw new Error('Workflow gateway returned an invalid run envelope.');
    }
    return {
      workflowRunId: envelope.workflowRunId,
      status: envelope.status as WorkflowStatus,
      accepted: response.status === 202,
      ...(typeof envelope.statusUrl === 'string' ? { statusUrl: envelope.statusUrl } : {}),
      ...(Object.hasOwn(envelope, 'result') ? { result: envelope.result as T } : {}),
      ...(Object.hasOwn(envelope, 'error') ? { error: envelope.error } : {}),
    };
  };
  return {
    submit<T = unknown>(workflowId: string, input: unknown, { async, runName }: SubmissionOptions = {}) {
      if (!uuid.test(workflowId)) throw new Error('A valid workflow ID is required.');
      const mode = async === undefined ? '' : `?mode=${async ? 'async' : 'sync'}`;
      return request<T>(`/wf/${workflowId}/trigger${mode}`, 'POST', { input, ...(runName ? { runName } : {}) });
    },
    status<T = unknown>(workflowRunId: string) {
      if (!uuid.test(workflowRunId)) throw new Error('A valid workflow run ID is required.');
      return request<T>(`/wf/runs/${workflowRunId}`, 'GET');
    },
  };
}
