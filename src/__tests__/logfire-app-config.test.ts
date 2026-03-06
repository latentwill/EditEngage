/**
 * @behavior When the SvelteKit app starts, Logfire is initialized for API route tracing
 * @business_rule App must have Logfire configured for observability
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockConfigure = vi.fn();

vi.mock('@pydantic/logfire-node', () => ({
  default: {
    configure: mockConfigure
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
        configure: mockConfigure
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

  it('reads LOGFIRE_TOKEN from environment variables', async () => {
    process.env.LOGFIRE_TOKEN = 'custom-app-token';

    vi.resetModules();

    vi.doMock('@pydantic/logfire-node', () => ({
      default: {
        configure: mockConfigure
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
