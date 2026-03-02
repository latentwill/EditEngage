/**
 * @behavior When the worker boots, a Scheduler instance is created with the queue
 * @business_rule Scheduled pipelines and research jobs must be active when the
 * worker starts, so the Scheduler must be instantiated during boot
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies before importing main
const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: '1', name: 'test' }),
  removeRepeatable: vi.fn().mockResolvedValue(undefined)
};

const mockCreateQueue = vi.fn().mockReturnValue(mockQueue);

vi.mock('./queue', () => ({
  createQueue: mockCreateQueue
}));

const mockCreateWorker = vi.fn();
vi.mock('./worker', () => ({
  createWorker: mockCreateWorker
}));

const mockCheckHealth = vi.fn().mockResolvedValue({ status: 'ok', redis: true });
vi.mock('./health', () => ({
  checkHealth: mockCheckHealth
}));

const mockSchedulerInstance = {};
const MockScheduler = vi.fn().mockReturnValue(mockSchedulerInstance);
vi.mock('./scheduler', () => ({
  Scheduler: MockScheduler
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    })
  })
}));

vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG')
  }));
  return { default: MockRedis };
});

vi.mock('fs', () => ({
  writeFileSync: vi.fn()
}));

describe('Worker main boot sequence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    vi.unstubAllEnvs();
  });

  it('instantiates a Scheduler with the queue when booting', async () => {
    // Use dynamic import to re-run main.ts side effects
    // resetModules ensures a fresh execution
    vi.resetModules();

    // Re-apply mocks after resetModules
    vi.doMock('./queue', () => ({
      createQueue: mockCreateQueue
    }));
    vi.doMock('./worker', () => ({
      createWorker: mockCreateWorker
    }));
    vi.doMock('./health', () => ({
      checkHealth: mockCheckHealth
    }));
    vi.doMock('./scheduler', () => ({
      Scheduler: MockScheduler
    }));
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })
    }));
    vi.doMock('ioredis', () => {
      const MockRedis = vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        ping: vi.fn().mockResolvedValue('PONG')
      }));
      return { default: MockRedis };
    });
    vi.doMock('fs', () => ({
      writeFileSync: vi.fn()
    }));

    await import('./main');

    expect(mockCreateQueue).toHaveBeenCalled();
    expect(MockScheduler).toHaveBeenCalledWith(mockQueue);
  });
});
