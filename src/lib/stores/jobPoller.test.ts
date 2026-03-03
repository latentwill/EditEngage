/**
 * @behavior pollJobStatus polls GET /api/v1/jobs/:jobId every interval until
 * the job reaches a terminal state (completed or failed), then stops. It calls
 * an onUpdate callback with each status response, and respects a max poll count
 * to prevent infinite loops.
 * @business_rule After a workflow "Run Now" returns a jobId, the UI needs to
 * poll for status updates so the user sees real-time progress without requiring
 * WebSocket infrastructure on every deployment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pollJobStatus, type JobStatusResponse } from './jobPoller.js';

describe('pollJobStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls onUpdate with running status and continues polling', async () => {
    const runningResponse: JobStatusResponse = {
      status: 'running',
      currentStep: 1,
      totalSteps: 3,
      currentAgent: 'writer'
    };

    const completedResponse: JobStatusResponse = {
      status: 'completed',
      result: { articleId: 'art-1' }
    };

    const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(new Response(JSON.stringify(runningResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(completedResponse), { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    const onUpdate = vi.fn();

    const promise = pollJobStatus('job-123', {
      onUpdate,
      intervalMs: 2000
    });

    // First poll fires immediately
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/jobs/job-123');
    expect(onUpdate).toHaveBeenCalledWith(runningResponse);

    // Advance to trigger second poll
    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUpdate).toHaveBeenCalledWith(completedResponse);

    const result = await promise;
    expect(result).toEqual(completedResponse);
  });

  it('stops polling when job status is completed', async () => {
    const completedResponse: JobStatusResponse = {
      status: 'completed',
      result: { done: true }
    };

    const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify(completedResponse), { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    const onUpdate = vi.fn();

    const result = await pollJobStatus('job-456', {
      onUpdate,
      intervalMs: 1000
    });

    expect(result.status).toBe('completed');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance time -- should NOT poll again
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops polling when job status is failed', async () => {
    const failedResponse: JobStatusResponse = {
      status: 'failed',
      error: 'Agent timeout after 30s'
    };

    const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify(failedResponse), { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    const onUpdate = vi.fn();

    const result = await pollJobStatus('job-789', {
      onUpdate,
      intervalMs: 1000
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Agent timeout after 30s');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops after maxPolls to prevent infinite loops', async () => {
    vi.useRealTimers();

    const runningResponse: JobStatusResponse = {
      status: 'running',
      currentStep: 1,
      totalSteps: 3,
      currentAgent: 'writer'
    };

    const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()
      .mockImplementation(async () => new Response(JSON.stringify(runningResponse), { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    const onUpdate = vi.fn();

    const result = await pollJobStatus('job-stuck', {
      onUpdate,
      intervalMs: 50,
      maxPolls: 3
    });

    expect(result.status).toBe('running');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onUpdate).toHaveBeenCalledTimes(3);

    vi.useFakeTimers();
  });

  it('returns error response when fetch fails', async () => {
    const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()
      .mockRejectedValue(new Error('Network error'));

    vi.stubGlobal('fetch', fetchMock);

    const onUpdate = vi.fn();

    const result = await pollJobStatus('job-err', {
      onUpdate,
      intervalMs: 1000
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Network error');
  });
});
