export interface JobStatusResponse {
  status: 'queued' | 'running' | 'completed' | 'failed';
  currentStep?: number;
  totalSteps?: number;
  currentAgent?: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface PollOptions {
  onUpdate: (status: JobStatusResponse) => void;
  intervalMs?: number;
  maxPolls?: number;
}

const DEFAULT_INTERVAL_MS = 3000;
const DEFAULT_MAX_POLLS = 60;

export function pollJobStatus(
  jobId: string,
  options: PollOptions
): Promise<JobStatusResponse> {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const maxPolls = options.maxPolls ?? DEFAULT_MAX_POLLS;
  let pollCount = 0;

  return new Promise((resolve) => {
    async function poll() {
      pollCount++;

      let response: JobStatusResponse;
      try {
        const res = await fetch(`/api/v1/jobs/${jobId}`);
        response = (await res.json()) as JobStatusResponse;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        response = { status: 'failed', error: errorMessage };
      }

      options.onUpdate(response);

      if (response.status === 'completed' || response.status === 'failed' || pollCount >= maxPolls) {
        resolve(response);
        return;
      }

      setTimeout(poll, intervalMs);
    }

    poll();
  });
}
