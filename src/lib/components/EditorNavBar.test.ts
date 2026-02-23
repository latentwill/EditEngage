/**
 * @behavior EditorNavBar provides navigation controls for sequential content review
 * @business_rule Reviewers can efficiently navigate through filtered content items
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

import EditorNavBar from './EditorNavBar.svelte';

describe('EditorNavBar', () => {
  const defaultProps = {
    position: 3,
    total: 12,
    hasPrev: true,
    hasNext: true,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render "Back to Feed" button', () => {
    render(EditorNavBar, { props: defaultProps });
    const backBtn = screen.getByTestId('editor-back-btn');
    expect(backBtn).toBeInTheDocument();
    expect(backBtn.textContent).toContain('Back to Feed');
  });

  it('should call onBack when back button clicked', async () => {
    render(EditorNavBar, { props: defaultProps });
    await fireEvent.click(screen.getByTestId('editor-back-btn'));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('should show position indicator "3 of 12"', () => {
    render(EditorNavBar, { props: defaultProps });
    expect(screen.getByTestId('editor-position').textContent).toContain('3 of 12');
  });

  it('should render Prev button disabled on first item', () => {
    render(EditorNavBar, { props: { ...defaultProps, hasPrev: false, position: 1 } });
    expect(screen.getByTestId('editor-prev-btn')).toBeDisabled();
  });

  it('should render Next button disabled on last item', () => {
    render(EditorNavBar, { props: { ...defaultProps, hasNext: false, position: 12 } });
    expect(screen.getByTestId('editor-next-btn')).toBeDisabled();
  });

  it('should call onNext when Next clicked', async () => {
    render(EditorNavBar, { props: defaultProps });
    await fireEvent.click(screen.getByTestId('editor-next-btn'));
    expect(defaultProps.onNext).toHaveBeenCalled();
  });

  it('should call onPrev when Prev clicked', async () => {
    render(EditorNavBar, { props: defaultProps });
    await fireEvent.click(screen.getByTestId('editor-prev-btn'));
    expect(defaultProps.onPrev).toHaveBeenCalled();
  });
});
