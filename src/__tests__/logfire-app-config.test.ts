/**
 * @behavior When the SvelteKit app starts, Logfire is initialized for API route tracing
 * @business_rule App must have Logfire configured for observability
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn()
}));

describe('Logfire app configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LOGFIRE_TOKEN = 'test-logfire-token';
  });

  it('calls Logfire.configure with serviceName and token on boot', async () => {
    vi.resetModules();

    vi.doMock('@pydantic/logfire-node', () => ({
      default: {
        configure: mockConfigure,
        span: mockSpan
      }
    }));
    vi.doMock('$lib/server/supabase', () => ({
      createServerSupabaseClient: vi.fn()
    }));

    await import('../../src/hooks.server');

    expect(mockConfigure).toHaveBeenCalledWith({
      serviceName: 'editengage-app',
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
    vi.doMock('$lib/server/supabase', () => ({
      createServerSupabaseClient: vi.fn()
    }));

    await import('../../src/hooks.server');

    expect(localMockSpan).toHaveBeenCalledWith(
      'app.startup',
      expect.objectContaining({
        attributes: expect.objectContaining({
          'service.name': 'editengage-app'
        }),
        callback: expect.any(Function)
      })
    );
  });

  it('reads LOGFIRE_TOKEN from environment variables', async () => {
    process.env.LOGFIRE_TOKEN = 'custom-app-token';

    vi.resetModules();

    vi.doMock('@pydantic/logfire-node', () => ({
      default: {
        configure: mockConfigure,
        span: mockSpan
      }
    }));
    vi.doMock('$lib/server/supabase', () => ({
      createServerSupabaseClient: vi.fn()
    }));

    await import('../../src/hooks.server');

    expect(mockConfigure).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'custom-app-token'
      })
    );
  });
});
