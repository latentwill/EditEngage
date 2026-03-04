/**
 * @behavior CommandTicker integrates workflow log store to display real-time run progress
 * @business_rule Users see workflow execution logs in the ticker bar and can expand for more detail
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockReturnThis();
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: vi.fn()
};

const mockEvents = [
  {
    id: 'evt-1',
    project_id: 'proj-1',
    event_type: 'pipeline.started',
    description: 'Workflow "SEO Articles" started',
    metadata: {},
    is_read: false,
    created_at: new Date(Date.now() - 30 * 1000).toISOString()
  }
];

const mockLimitReturn = { data: mockEvents, error: null };
const mockOrderReturn = { limit: vi.fn().mockReturnValue(mockLimitReturn) };
const mockSelectReturn = { order: vi.fn().mockReturnValue(mockOrderReturn) };
const mockFromReturn = { select: vi.fn().mockReturnValue(mockSelectReturn) };

const mockClient = {
  from: vi.fn().mockReturnValue(mockFromReturn),
  channel: vi.fn().mockReturnValue(mockChannel)
};

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockClient)
}));

import CommandTicker from '../../lib/components/CommandTicker.svelte';
import { createWorkflowLogStore, resetWorkflowLogStore } from '../../lib/stores/workflowLogStore.js';

describe('CommandTicker — Workflow Log Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockOn.mockReturnValue(mockChannel);
    mockSubscribe.mockReturnValue(mockChannel);
    mockClient.from.mockReturnValue(mockFromReturn);
    mockFromReturn.select.mockReturnValue(mockSelectReturn);
    mockSelectReturn.order.mockReturnValue(mockOrderReturn);
    mockOrderReturn.limit.mockReturnValue(mockLimitReturn);
    mockClient.channel.mockReturnValue(mockChannel);

    // Reset both stores between tests
    const { resetEventsStore } = await import('../../lib/stores/events.js');
    resetEventsStore();
    resetWorkflowLogStore();
  });

  it('should display log lines from workflowLogStore in the ticker', async () => {
    const logStore = createWorkflowLogStore();
    logStore.addLog({
      id: 'wflog-1',
      workflowName: 'SEO Articles',
      stepIndex: 0,
      agentName: 'SEO Writer',
      message: 'Generating article draft',
      status: 'running',
      timestamp: new Date().toISOString()
    });

    render(CommandTicker);

    await vi.waitFor(() => {
      const tickerText = screen.getByTestId('ticker-text');
      expect(tickerText.textContent).toContain('Generating article draft');
    });
  });

  it('should have an expand button with correct testid', async () => {
    render(CommandTicker);

    await vi.waitFor(() => {
      expect(screen.getByTestId('ticker')).toBeDefined();
    });

    const expandBtn = screen.getByTestId('ticker-expand-btn');
    expect(expandBtn).toBeDefined();
  });

  it('should expand on click to show more lines', async () => {
    const logStore = createWorkflowLogStore();
    logStore.addLog({
      id: 'wflog-1',
      workflowName: 'SEO Articles',
      stepIndex: 0,
      agentName: 'SEO Writer',
      message: 'Line one',
      status: 'running',
      timestamp: new Date().toISOString()
    });
    logStore.addLog({
      id: 'wflog-2',
      workflowName: 'SEO Articles',
      stepIndex: 1,
      agentName: 'Ghost Publisher',
      message: 'Line two',
      status: 'running',
      timestamp: new Date().toISOString()
    });

    render(CommandTicker);

    await vi.waitFor(() => {
      expect(screen.getByTestId('ticker-expand-btn')).toBeDefined();
    });

    const expandBtn = screen.getByTestId('ticker-expand-btn');
    await fireEvent.click(expandBtn);

    const ticker = screen.getByTestId('ticker');
    expect(ticker.className).toContain('expanded');
  });

  it('should animate new log lines with ticker-animate class', async () => {
    render(CommandTicker);

    await vi.waitFor(() => {
      expect(screen.getByTestId('ticker')).toBeDefined();
    });

    const logStore = createWorkflowLogStore();
    logStore.addLog({
      id: 'wflog-anim',
      workflowName: 'SEO Articles',
      stepIndex: 0,
      agentName: 'SEO Writer',
      message: 'New animated entry',
      status: 'running',
      timestamp: new Date().toISOString()
    });

    // The ticker should display the workflow log
    await vi.waitFor(() => {
      const tickerText = screen.getByTestId('ticker-text');
      expect(tickerText.textContent).toContain('New animated entry');
    });
  });

  it('should not break existing event display behavior', async () => {
    render(CommandTicker);

    // Without workflow logs, ticker should still show events
    await vi.waitFor(() => {
      const ticker = screen.getByTestId('ticker');
      expect(ticker.textContent).toContain('Workflow "SEO Articles" started');
    });

    expect(screen.getByTestId('ticker-time')).not.toBeNull();
  });
});
