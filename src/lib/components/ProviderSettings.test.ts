/**
 * @behavior ProviderSettings allows configuring API keys for research providers
 * @business_rule Each research provider needs a valid API key to be used in research queries
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

import ProviderSettings from './ProviderSettings.svelte';

const PROVIDERS = ['perplexity', 'tavily', 'openai', 'serper', 'exa', 'brave', 'openrouter'] as const;

function createMockProviders() {
  return PROVIDERS.map((provider) => ({
    id: `id-${provider}`,
    provider,
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
    api_key: '',
    is_active: false
  }));
}

describe('ProviderSettings', () => {
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnToggle: ReturnType<typeof vi.fn>;
  let mockOnTest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave = vi.fn();
    mockOnToggle = vi.fn();
    mockOnTest = vi.fn().mockResolvedValue(true);
  });

  function renderComponent(overrides: Record<string, unknown> = {}) {
    return render(ProviderSettings, {
      props: {
        providers: createMockProviders(),
        onSave: mockOnSave,
        onToggle: mockOnToggle,
        onTest: mockOnTest,
        ...overrides
      }
    });
  }

  it('should list all 7 supported providers', () => {
    renderComponent();

    for (const provider of PROVIDERS) {
      expect(screen.getByTestId(`provider-row-${provider}`)).toBeInTheDocument();
    }
  });

  it('should render API key input for each provider', () => {
    renderComponent();

    for (const provider of PROVIDERS) {
      const input = screen.getByTestId(`provider-key-input-${provider}`);
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    }
  });

  it('should call onSave with provider and key when Save clicked', async () => {
    renderComponent();

    const input = screen.getByTestId('provider-key-input-perplexity') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'sk-test-key-123' } });

    const saveBtn = screen.getByTestId('provider-save-btn-perplexity');
    await fireEvent.click(saveBtn);

    expect(mockOnSave).toHaveBeenCalledWith('perplexity', 'sk-test-key-123');
  });

  it('should call onTest when Test Connection clicked', async () => {
    renderComponent();

    const testBtn = screen.getByTestId('provider-test-btn-perplexity');
    await fireEvent.click(testBtn);

    expect(mockOnTest).toHaveBeenCalledWith('perplexity');
  });

  it('should show success indicator after successful test', async () => {
    mockOnTest.mockResolvedValue(true);
    renderComponent();

    const testBtn = screen.getByTestId('provider-test-btn-perplexity');
    await fireEvent.click(testBtn);

    await vi.waitFor(() => {
      const status = screen.getByTestId('provider-test-status-perplexity');
      expect(status).toBeInTheDocument();
      expect(status.textContent).toContain('Success');
    });
  });

  it('should show error indicator after failed test', async () => {
    mockOnTest.mockResolvedValue(false);
    renderComponent();

    const testBtn = screen.getByTestId('provider-test-btn-perplexity');
    await fireEvent.click(testBtn);

    await vi.waitFor(() => {
      const status = screen.getByTestId('provider-test-status-perplexity');
      expect(status).toBeInTheDocument();
      expect(status.textContent).toContain('Error');
    });
  });

  it('should call onToggle when toggle clicked', async () => {
    renderComponent();

    const toggle = screen.getByTestId('provider-toggle-perplexity');
    await fireEvent.click(toggle);

    expect(mockOnToggle).toHaveBeenCalledWith('id-perplexity', true);
  });
});
