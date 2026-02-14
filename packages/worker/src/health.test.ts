/**
 * @behavior Worker health check verifies Redis connection readiness
 * @business_rule The worker must report its health status including Redis
 * connectivity so orchestration tools can route traffic appropriately
 */
import { describe, it, expect, vi } from 'vitest';

describe('Worker Health Check', () => {
  it('confirms Redis connection readiness', async () => {
    const { checkHealth } = await import('./health');

    const mockRedis = {
      ping: vi.fn().mockResolvedValue('PONG')
    };

    const result = await checkHealth(mockRedis);

    expect(result.status).toBe('ok');
    expect(result.redis).toBe(true);
  });

  it('reports degraded status when Redis is unavailable', async () => {
    const { checkHealth } = await import('./health');

    const mockRedis = {
      ping: vi.fn().mockRejectedValue(new Error('Connection refused'))
    };

    const result = await checkHealth(mockRedis);

    expect(result.status).toBe('degraded');
    expect(result.redis).toBe(false);
  });
});
