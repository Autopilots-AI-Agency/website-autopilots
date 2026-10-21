import { createLogger } from '../logger.ts';

export interface LogEntry {
    level: string;
    timestamp: string;
    service: string;
    message: string;
    event?: string;
    request_id?: string;
    err?: { code?: string; stack?: string };
    [key: string]: unknown;
}

export function capture(env: NodeJS.ProcessEnv = {}) {
    const logs: LogEntry[] = [];
    const logger = createLogger({ env: { SERVICE_NAME: 'test-api', ...env },
        stream: { write: line => logs.push(JSON.parse(line)) } });
    return { logger, logs };
}

