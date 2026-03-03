/**
 * @behavior OrchestrationFeedFilters provides filter controls for the orchestration event feed
 * @business_rule Users need to filter orchestration events by module, time range,
 * and agent origin to monitor system activity efficiently
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import OrchestrationFeedFilters from './OrchestrationFeedFilters.svelte';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

describe('OrchestrationFeedFilters', () => {
  it('should render all module filter chips', () => {
    render(OrchestrationFeedFilters, {
      props: { onFilter: vi.fn() }
    });

    expect(screen.getByTestId('module-all')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Research' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Writing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'System' })).toBeInTheDocument();
  });

  it('should have "All" module chip active by default', () => {
    render(OrchestrationFeedFilters, {
      props: { onFilter: vi.fn() }
    });

    const allChip = screen.getByTestId('module-all');
    expect(allChip.className).toContain('btn-primary');

    const researchChip = screen.getByRole('button', { name: 'Research' });
    expect(researchChip.className).toContain('btn-ghost');
  });

  it('should call onFilter with selected module when clicking a module chip', async () => {
    const onFilter = vi.fn();
    render(OrchestrationFeedFilters, {
      props: { onFilter }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Research' }));

    expect(onFilter).toHaveBeenCalledWith({
      module: 'research',
      timeRange: '24h',
      agentOnly: false
    });
  });

  it('should call onFilter with module null when clicking "All"', async () => {
    const onFilter = vi.fn();
    render(OrchestrationFeedFilters, {
      props: { onFilter }
    });

    // First select a module
    await fireEvent.click(screen.getByRole('button', { name: 'Writing' }));
    // Then click All (module)
    await fireEvent.click(screen.getByTestId('module-all'));

    expect(onFilter).toHaveBeenLastCalledWith({
      module: null,
      timeRange: '24h',
      agentOnly: false
    });
  });

  it('should render time range buttons', () => {
    render(OrchestrationFeedFilters, {
      props: { onFilter: vi.fn() }
    });

    expect(screen.getByRole('button', { name: '1h' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '24h' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument();
    // "All" button for time range - use testid to disambiguate from module "All"
    expect(screen.getByTestId('time-range-all')).toBeInTheDocument();
  });

  it('should have "24h" time range active by default', () => {
    render(OrchestrationFeedFilters, {
      props: { onFilter: vi.fn() }
    });

    const btn24h = screen.getByRole('button', { name: '24h' });
    expect(btn24h.className).toContain('btn-primary');

    const btn1h = screen.getByRole('button', { name: '1h' });
    expect(btn1h.className).toContain('btn-ghost');
  });

  it('should call onFilter with selected time range', async () => {
    const onFilter = vi.fn();
    render(OrchestrationFeedFilters, {
      props: { onFilter }
    });

    await fireEvent.click(screen.getByRole('button', { name: '7d' }));

    expect(onFilter).toHaveBeenCalledWith({
      module: null,
      timeRange: '7d',
      agentOnly: false
    });
  });

  it('should have agent toggle unchecked by default', () => {
    render(OrchestrationFeedFilters, {
      props: { onFilter: vi.fn() }
    });

    const toggle = screen.getByRole('checkbox', { name: /agent events only/i });
    expect(toggle).not.toBeChecked();
  });

  it('should call onFilter with agentOnly true when toggling checkbox', async () => {
    const onFilter = vi.fn();
    render(OrchestrationFeedFilters, {
      props: { onFilter }
    });

    const toggle = screen.getByRole('checkbox', { name: /agent events only/i });
    await fireEvent.click(toggle);

    expect(onFilter).toHaveBeenCalledWith({
      module: null,
      timeRange: '24h',
      agentOnly: true
    });
  });
});
