import Logfire from '@pydantic/logfire-node';

export interface ExternalHealthResult {
  status: 'UP' | 'DEGRADED' | 'DOWN';
  externalCheck: {
    reachable: boolean;
    responseTimeMs?: number;
    errorCategory?: string;
  };
  timestamp: string;
}

export function categorizeError(err: unknown): string {
  const message = err instanceof DOMException && err.name === 'AbortError'
    ? 'TIMEOUT'
    : err instanceof Error
      ? err.message
      : String(err);

  if (message === 'TIMEOUT' || message.includes('abort')) return 'TIMEOUT';
  if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) return 'DNS_FAILURE';
  if (message.includes('ECONNREFUSED')) return 'CONNECTION_REFUSED';
  if (message.includes('ECONNRESET')) return 'CONNECTION_RESET';
  if (message.includes('ENETUNREACH') || message.includes('network')) return 'NETWORK_ERROR';
  return 'UNKNOWN';
}

export async function checkExternalHealth(url: string, timeoutMs: number): Promise<ExternalHealthResult> {
  const start = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const responseTimeMs = Date.now() - start;

    if (response.ok) {
      return {
        status: 'UP',
        externalCheck: { reachable: true, responseTimeMs },
        timestamp: new Date().toISOString()
      };
    }

    return {
      status: 'DEGRADED',
      externalCheck: { reachable: true, responseTimeMs },
      timestamp: new Date().toISOString()
    };
  } catch (err: unknown) {
    return {
      status: 'DOWN',
      externalCheck: {
        reachable: false,
        errorCategory: categorizeError(err)
      },
      timestamp: new Date().toISOString()
    };
  }
}

let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 3;

export function resetConsecutiveFailures(): void {
  consecutiveFailures = 0;
}

export function getConsecutiveFailures(): number {
  return consecutiveFailures;
}

export async function runProbe(url: string, timeoutMs: number): Promise<ExternalHealthResult> {
  const result = await checkExternalHealth(url, timeoutMs);

  if (result.status === 'DOWN') {
    consecutiveFailures++;
  } else {
    consecutiveFailures = 0;
  }

  Logfire.span('external_health.probe', {
    attributes: {
      url,
      status: result.status,
      responseTimeMs: result.externalCheck.responseTimeMs ?? -1,
      consecutiveFailures
    },
    callback: () => {
      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        console.warn(`[PROBE] ${consecutiveFailures} consecutive external health check failures for ${url}`);
      }
    }
  });

  return result;
}
