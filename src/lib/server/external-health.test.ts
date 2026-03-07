/**
 * @behavior External health probe validates full routing chain (reverse proxy -> app)
 * @business_rule Alert after 3 consecutive failures to detect routing issues early
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSpan = vi.fn((_name: string, opts: { attributes: Record<string, unknown>; callback: () => void }) => {
  opts.callback();
});

vi.mock('@pydantic/logfire-node', () => ({
  default: {
    span: mockSpan
  }
}));

describe('external-health', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    // Reset module state between tests
    const mod = await import('./external-health.js');
    mod.resetConsecutiveFailures();
  });

  describe('checkExternalHealth', () => {
    it('returns UP with responseTimeMs when URL responds 200', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      const { checkExternalHealth } = await import('./external-health.js');
      const result = await checkExternalHealth('https://example.com/health', 5000);

      expect(result.status).toBe('UP');
      expect(result.externalCheck.reachable).toBe(true);
      expect(typeof result.externalCheck.responseTimeMs).toBe('number');
      expect(result.externalCheck.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeTruthy();
    });

    it('returns DEGRADED when URL responds non-200', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

      const { checkExternalHealth } = await import('./external-health.js');
      const result = await checkExternalHealth('https://example.com/health', 5000);

      expect(result.status).toBe('DEGRADED');
      expect(result.externalCheck.reachable).toBe(true);
      expect(typeof result.externalCheck.responseTimeMs).toBe('number');
    });

    it('returns DOWN when fetch throws network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const { checkExternalHealth } = await import('./external-health.js');
      const result = await checkExternalHealth('https://example.com/health', 5000);

      expect(result.status).toBe('DOWN');
      expect(result.externalCheck.reachable).toBe(false);
      expect(result.externalCheck.errorCategory).toBe('CONNECTION_REFUSED');
    });

    it('returns DOWN with TIMEOUT category on timeout', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);

      const { checkExternalHealth } = await import('./external-health.js');
      const result = await checkExternalHealth('https://example.com/health', 5000);

      expect(result.status).toBe('DOWN');
      expect(result.externalCheck.reachable).toBe(false);
      expect(result.externalCheck.errorCategory).toBe('TIMEOUT');
    });
  });

  describe('categorizeError', () => {
    it('maps DNS errors to DNS_FAILURE', async () => {
      const { categorizeError } = await import('./external-health.js');
      expect(categorizeError(new Error('getaddrinfo ENOTFOUND example.com'))).toBe('DNS_FAILURE');
    });

    it('maps connection refused to CONNECTION_REFUSED', async () => {
      const { categorizeError } = await import('./external-health.js');
      expect(categorizeError(new Error('ECONNREFUSED'))).toBe('CONNECTION_REFUSED');
    });
  });

  describe('runProbe', () => {
    it('resets consecutive failures on success', async () => {
      // First simulate a failure to increment counter
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));
      const mod = await import('./external-health.js');
      await mod.runProbe('https://example.com/health', 5000);
      expect(mod.getConsecutiveFailures()).toBe(1);

      // Now simulate success
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      await mod.runProbe('https://example.com/health', 5000);
      expect(mod.getConsecutiveFailures()).toBe(0);
    });

    it('increments consecutive failures on DOWN', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));
      const mod = await import('./external-health.js');

      await mod.runProbe('https://example.com/health', 5000);
      expect(mod.getConsecutiveFailures()).toBe(1);

      await mod.runProbe('https://example.com/health', 5000);
      expect(mod.getConsecutiveFailures()).toBe(2);
    });

    it('logs warning after 3 consecutive failures', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));
      const mod = await import('./external-health.js');

      await mod.runProbe('https://example.com/health', 5000);
      await mod.runProbe('https://example.com/health', 5000);
      expect(warnSpy).not.toHaveBeenCalled();

      await mod.runProbe('https://example.com/health', 5000);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('3 consecutive')
      );

      warnSpy.mockRestore();
    });
  });
});
