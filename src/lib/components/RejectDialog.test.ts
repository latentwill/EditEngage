/**
 * @behavior RejectDialog shows a modal with textarea for rejection reason and confirm/cancel buttons
 * @business_rule Content rejection requires a written reason to provide feedback to the content pipeline
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

describe('RejectDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show dialog with textarea for rejection reason', async () => {
    const RejectDialog = (await import('./RejectDialog.svelte')).default;

    render(RejectDialog, {
      props: {
        isOpen: true,
        onConfirm: vi.fn(),
        onCancel: vi.fn()
      }
    });

    expect(screen.getByTestId('reject-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('reject-reason-textarea')).toBeInTheDocument();
    expect(screen.getByTestId('reject-confirm-btn')).toBeInTheDocument();
  });

  it('should call onConfirm with reason text when confirmed', async () => {
    const onConfirmFn = vi.fn();
    const RejectDialog = (await import('./RejectDialog.svelte')).default;

    render(RejectDialog, {
      props: {
        isOpen: true,
        onConfirm: onConfirmFn,
        onCancel: vi.fn()
      }
    });

    const textarea = screen.getByTestId('reject-reason-textarea');
    await fireEvent.input(textarea, { target: { value: 'Content quality too low' } });

    const confirmBtn = screen.getByTestId('reject-confirm-btn');
    await fireEvent.click(confirmBtn);

    expect(onConfirmFn).toHaveBeenCalledWith('Content quality too low');
  });

  it('should call onCancel when cancel is clicked', async () => {
    const onCancelFn = vi.fn();
    const RejectDialog = (await import('./RejectDialog.svelte')).default;

    render(RejectDialog, {
      props: {
        isOpen: true,
        onConfirm: vi.fn(),
        onCancel: onCancelFn
      }
    });

    const cancelBtn = screen.getByTestId('reject-cancel-btn');
    await fireEvent.click(cancelBtn);

    expect(onCancelFn).toHaveBeenCalledOnce();
  });

  it('should disable confirm when reason is empty', async () => {
    const RejectDialog = (await import('./RejectDialog.svelte')).default;

    render(RejectDialog, {
      props: {
        isOpen: true,
        onConfirm: vi.fn(),
        onCancel: vi.fn()
      }
    });

    const confirmBtn = screen.getByTestId('reject-confirm-btn');
    expect(confirmBtn).toBeDisabled();
  });
});
