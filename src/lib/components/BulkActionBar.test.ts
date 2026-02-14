/**
 * @behavior BulkActionBar renders a sticky action bar when content items are selected,
 * showing selection count and providing approve/reject bulk actions
 * @business_rule Bulk actions apply the same status transition to all selected items;
 * the bar is only visible when at least one item is selected
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('BulkActionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
  });

  it('renders selected count and action buttons when items are selected', async () => {
    const BulkActionBar = (await import('./BulkActionBar.svelte')).default;

    render(BulkActionBar, {
      props: {
        selectedIds: ['content-1', 'content-2', 'content-3'],
        onapprove: vi.fn(),
        onreject: vi.fn()
      }
    });

    const bar = screen.getByTestId('bulk-action-bar');
    expect(bar).toBeInTheDocument();

    // Should show count of selected items
    expect(screen.getByTestId('selected-count')).toHaveTextContent('3');

    // Should have approve and reject buttons
    expect(screen.getByTestId('bulk-approve-btn')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-reject-btn')).toBeInTheDocument();
  });

  it('is not visible when no items are selected', async () => {
    const BulkActionBar = (await import('./BulkActionBar.svelte')).default;

    render(BulkActionBar, {
      props: {
        selectedIds: [],
        onapprove: vi.fn(),
        onreject: vi.fn()
      }
    });

    expect(screen.queryByTestId('bulk-action-bar')).not.toBeInTheDocument();
  });

  it('calls onapprove callback when Approve All is clicked', async () => {
    const onapproveFn = vi.fn();
    const BulkActionBar = (await import('./BulkActionBar.svelte')).default;

    render(BulkActionBar, {
      props: {
        selectedIds: ['content-1', 'content-2'],
        onapprove: onapproveFn,
        onreject: vi.fn()
      }
    });

    const approveBtn = screen.getByTestId('bulk-approve-btn');
    await fireEvent.click(approveBtn);

    expect(onapproveFn).toHaveBeenCalledOnce();
  });

  it('calls onreject callback when Reject All is clicked', async () => {
    const onrejectFn = vi.fn();
    const BulkActionBar = (await import('./BulkActionBar.svelte')).default;

    render(BulkActionBar, {
      props: {
        selectedIds: ['content-1', 'content-2'],
        onapprove: vi.fn(),
        onreject: onrejectFn
      }
    });

    const rejectBtn = screen.getByTestId('bulk-reject-btn');
    await fireEvent.click(rejectBtn);

    expect(onrejectFn).toHaveBeenCalledOnce();
  });
});
