/**
 * @behavior StepConfig displays per-agent topic and destination selectors.
 * Topics and destinations are fetched from the API. Config is stored in a map
 * keyed by agent ID.
 * @business_rule Each selected agent must have a topic and destination assigned.
 * Empty states are shown when no topics or destinations exist.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, afterEach } from 'vitest';
import StepConfig from '$lib/components/wizard/StepConfig.svelte';

const MOCK_SELECTED_AGENTS = [
  { id: 'agent-w1', name: 'SEO Blog Writer', type: 'writing' as const },
  { id: 'agent-r1', name: 'Market Researcher', type: 'research' as const }
];

const MOCK_TOPICS = [
  { id: 'topic-1', title: 'AI in Healthcare', project_id: 'proj-1', status: 'pending' },
  { id: 'topic-2', title: 'Climate Tech', project_id: 'proj-1', status: 'pending' }
];

const MOCK_DESTINATIONS = [
  { id: 'dest-1', name: 'My Ghost Blog', type: 'ghost', project_id: 'proj-1' },
  { id: 'dest-2', name: 'Webhook Endpoint', type: 'webhook', project_id: 'proj-1' }
];

function mockFetchForConfig(
  topics: typeof MOCK_TOPICS = MOCK_TOPICS,
  destinations: typeof MOCK_DESTINATIONS = MOCK_DESTINATIONS
) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/v1/topics')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: topics })
      });
    }
    if (url.includes('/api/v1/destinations')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: destinations })
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Not found' }) });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('StepConfig — Per-Agent Configuration (Task 7)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should display each selected agent with a topic selector', async () => {
    mockFetchForConfig();

    render(StepConfig, {
      props: {
        projectId: 'proj-1',
        selectedAgents: MOCK_SELECTED_AGENTS,
        agentConfigs: {},
        onConfigChange: vi.fn(),
        validationError: null
      }
    });

    // Wait for topic options to render (indicates fetch completed)
    await waitFor(() => {
      expect(screen.getAllByText('AI in Healthcare').length).toBeGreaterThan(0);
    });

    expect(screen.getByTestId('agent-topic-select-agent-w1')).toBeInTheDocument();
    expect(screen.getByTestId('agent-topic-select-agent-r1')).toBeInTheDocument();

    const topicSelect = screen.getByTestId('agent-topic-select-agent-w1') as HTMLSelectElement;
    const options = topicSelect.querySelectorAll('option');
    const optionTexts = Array.from(options).map((o) => o.textContent);
    expect(optionTexts.some((t) => t?.includes('AI in Healthcare'))).toBe(true);
    expect(optionTexts.some((t) => t?.includes('Climate Tech'))).toBe(true);
  });

  it('should display each selected agent with a destination selector', async () => {
    mockFetchForConfig();

    render(StepConfig, {
      props: {
        projectId: 'proj-1',
        selectedAgents: MOCK_SELECTED_AGENTS,
        agentConfigs: {},
        onConfigChange: vi.fn(),
        validationError: null
      }
    });

    // Wait for destination options to render
    await waitFor(() => {
      expect(screen.getAllByText('My Ghost Blog').length).toBeGreaterThan(0);
    });

    expect(screen.getByTestId('agent-destination-select-agent-w1')).toBeInTheDocument();
    expect(screen.getByTestId('agent-destination-select-agent-r1')).toBeInTheDocument();

    const destSelect = screen.getByTestId('agent-destination-select-agent-w1') as HTMLSelectElement;
    const options = destSelect.querySelectorAll('option');
    const optionTexts = Array.from(options).map((o) => o.textContent);
    expect(optionTexts.some((t) => t?.includes('My Ghost Blog'))).toBe(true);
    expect(optionTexts.some((t) => t?.includes('Webhook Endpoint'))).toBe(true);
  });

  it('should show empty state when no topics exist', async () => {
    mockFetchForConfig([], MOCK_DESTINATIONS);

    render(StepConfig, {
      props: {
        projectId: 'proj-1',
        selectedAgents: MOCK_SELECTED_AGENTS,
        agentConfigs: {},
        onConfigChange: vi.fn(),
        validationError: null
      }
    });

    await waitFor(() => {
      const container = screen.getByTestId('step-config');
      expect(container.textContent?.toLowerCase()).toContain('no topics');
    });
  });

  it('should persist configuration via onConfigChange when selectors change', async () => {
    mockFetchForConfig();
    const onConfigChange = vi.fn();

    render(StepConfig, {
      props: {
        projectId: 'proj-1',
        selectedAgents: MOCK_SELECTED_AGENTS,
        agentConfigs: {},
        onConfigChange,
        validationError: null
      }
    });

    // Wait for options to be populated from fetch
    await waitFor(() => {
      expect(screen.getAllByText('AI in Healthcare').length).toBeGreaterThan(0);
    });

    const topicSelect = screen.getByTestId('agent-topic-select-agent-w1') as HTMLSelectElement;
    topicSelect.value = 'topic-1';
    await fireEvent.change(topicSelect);

    expect(onConfigChange).toHaveBeenCalledWith('agent-w1', 'topic_id', 'topic-1');

    const destSelect = screen.getByTestId('agent-destination-select-agent-w1') as HTMLSelectElement;
    destSelect.value = 'dest-1';
    await fireEvent.change(destSelect);

    expect(onConfigChange).toHaveBeenCalledWith('agent-w1', 'destination_id', 'dest-1');
  });
});
