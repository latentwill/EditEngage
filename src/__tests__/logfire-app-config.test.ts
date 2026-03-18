/**
 * @behavior When the SvelteKit app starts, Logfire is initialized for observability
 * @business_rule App must have Logfire configured and must not crash if it fails
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

    expect(mockConfigure).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'editengage-app',
        token: 'test-logfire-token',
        nodeAutoInstrumentations: expect.objectContaining({
          '@opentelemetry/instrumentation-http': expect.any(Object),
          '@opentelemetry/instrumentation-undici': expect.any(Object)
        })
      })
    );
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

  it('app still starts if Logfire.configure throws', async () => {
    vi.resetModules();

    vi.doMock('@pydantic/logfire-node', () => ({
      default: {
        configure: vi.fn(() => { throw new Error('OTEL init failed'); }),
        span: vi.fn()
      }
    }));
    vi.doMock('$lib/server/supabase', () => ({
      createServerSupabaseClient: vi.fn()
    }));

    // Should not throw — app must start even if Logfire fails
    await expect(import('../../src/hooks.server')).resolves.toBeDefined();
  });
});
