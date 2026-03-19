/**
 * @behavior When the worker starts, Logfire is initialized and ready to collect traces
 * @business_rule Worker must have Logfire configured before processing any jobs
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockConfigure = vi.fn();
const mockSpan = vi.fn((_name: string, opts: { callback?: () => void }) => {
  if (opts?.callback) opts.callback();
});

vi.mock('@pydantic/logfire-node', () => ({
  default: {
    configure: mockConfigure,
    span: mockSpan
  }
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

vi.mock('../worker', () => ({
  createWorker: vi.fn()
}));

vi.mock('../queue', () => ({
  createQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: '1', name: 'test' }),
    removeRepeatable: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('../scheduler', () => ({
  Scheduler: vi.fn()
}));

vi.mock('../health', () => ({
  checkHealth: vi.fn().mockResolvedValue({ status: 'ok', redis: true })
}));

vi.mock('fs', () => ({
  writeFileSync: vi.fn()
}));

describe('Logfire configuration', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key',
      LOGFIRE_TOKEN: 'test-logfire-token'
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('calls Logfire.configure with serviceName and token from env on boot', async () => {
    vi.resetModules();

    vi.doMock('@pydantic/logfire-node', () => ({
      default: {
        configure: mockConfigure,
        span: mockSpan
      }
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
    vi.doMock('../worker', () => ({ createWorker: vi.fn() }));
    vi.doMock('../queue', () => ({
      createQueue: vi.fn().mockReturnValue({
        add: vi.fn().mockResolvedValue({ id: '1', name: 'test' }),
        removeRepeatable: vi.fn().mockResolvedValue(undefined)
      })
    }));
    vi.doMock('../scheduler', () => ({ Scheduler: vi.fn() }));
    vi.doMock('../health', () => ({
      checkHealth: vi.fn().mockResolvedValue({ status: 'ok', redis: true })
    }));
    vi.doMock('fs', () => ({ writeFileSync: vi.fn() }));

    await import('../main');

    expect(mockConfigure).toHaveBeenCalledWith({
      serviceName: 'editengage-worker',
      token: 'test-logfire-token'
    });
  });

  it('sends a startup span on boot so Logfire dashboard shows initialization', async () => {
    vi.resetModules();

    const localMockSpan = vi.fn((_name: string, opts: { callback?: () => void }) => {
      if (opts?.callback) opts.callback();
    });

    vi.doMock('@pydantic/logfire-node', () => ({
      default: {
        configure: vi.fn(),
        span: localMockSpan
      }
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
    vi.doMock('../worker', () => ({ createWorker: vi.fn() }));
    vi.doMock('../queue', () => ({
      createQueue: vi.fn().mockReturnValue({
        add: vi.fn().mockResolvedValue({ id: '1', name: 'test' }),
        removeRepeatable: vi.fn().mockResolvedValue(undefined)
      })
    }));
    vi.doMock('../scheduler', () => ({ Scheduler: vi.fn() }));
    vi.doMock('../health', () => ({
      checkHealth: vi.fn().mockResolvedValue({ status: 'ok', redis: true })
    }));
    vi.doMock('fs', () => ({ writeFileSync: vi.fn() }));

    await import('../main');

    expect(localMockSpan).toHaveBeenCalledWith(
      'worker.startup',
      expect.objectContaining({
        attributes: expect.objectContaining({
          'service.name': 'editengage-worker'
        }),
        callback: expect.any(Function)
      })
    );
  });

  it('reads LOGFIRE_TOKEN from environment variables', async () => {
    process.env.LOGFIRE_TOKEN = 'custom-token-abc';

    vi.resetModules();

    vi.doMock('@pydantic/logfire-node', () => ({
      default: {
        configure: mockConfigure,
        span: mockSpan
      }
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
    vi.doMock('../worker', () => ({ createWorker: vi.fn() }));
    vi.doMock('../queue', () => ({
      createQueue: vi.fn().mockReturnValue({
        add: vi.fn().mockResolvedValue({ id: '1', name: 'test' }),
        removeRepeatable: vi.fn().mockResolvedValue(undefined)
      })
    }));
    vi.doMock('../scheduler', () => ({ Scheduler: vi.fn() }));
    vi.doMock('../health', () => ({
      checkHealth: vi.fn().mockResolvedValue({ status: 'ok', redis: true })
    }));
    vi.doMock('fs', () => ({ writeFileSync: vi.fn() }));

    await import('../main');

    expect(mockConfigure).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'custom-token-abc'
      })
    );
  });
});
