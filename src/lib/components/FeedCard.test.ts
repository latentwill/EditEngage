/**
 * @behavior FeedCard displays a content item in the review feed with actions
 * @business_rule Content reviewers need a card showing key content details
 * (project, pipeline, time, title, body preview, tags) with approve/reject/edit actions
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import FeedCard from './FeedCard.svelte';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

function createContent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'content-1',
    title: 'Test Article Title',
    body: { html: '<p>This is a test body with enough text to demonstrate truncation behavior in the card preview.</p>', text: 'This is a test body with enough text to demonstrate truncation behavior in the card preview.' },
    tags: ['seo', 'marketing', 'growth'],
    status: 'pending',
    content_type: 'article',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    pipeline: { name: 'Blog Pipeline' },
    project: { name: 'Marketing', color: '#3b82f6' },
    ...overrides
  };
}

describe('FeedCard', () => {
  it('should display project badge, pipeline name, and relative timestamp', () => {
    render(FeedCard, {
      props: {
        content: createContent(),
        showProjectBadge: true,
        onApprove: vi.fn(),
        onReject: vi.fn()
      }
    });

    expect(screen.getByTestId('feed-card')).toBeInTheDocument();
    expect(screen.getByTestId('project-badge')).toBeInTheDocument();
    expect(screen.getByTestId('feed-card-pipeline')).toHaveTextContent('Blog Pipeline');
    expect(screen.getByTestId('feed-card-timestamp')).toHaveTextContent(/ago/);
  });

  it('should display content title', () => {
    render(FeedCard, {
      props: {
        content: createContent({ title: 'My Great Article' }),
        showProjectBadge: false,
        onApprove: vi.fn(),
        onReject: vi.fn()
      }
    });

    expect(screen.getByTestId('feed-card-title')).toHaveTextContent('My Great Article');
  });

  it('should display 4-5 line body preview', () => {
    render(FeedCard, {
      props: {
        content: createContent(),
        showProjectBadge: false,
        onApprove: vi.fn(),
        onReject: vi.fn()
      }
    });

    const body = screen.getByTestId('feed-card-body');
    expect(body).toBeInTheDocument();
    expect(body.className).toContain('line-clamp');
  });

  it('should display tags as badges', () => {
    render(FeedCard, {
      props: {
        content: createContent({ tags: ['seo', 'marketing', 'growth'] }),
        showProjectBadge: false,
        onApprove: vi.fn(),
        onReject: vi.fn()
      }
    });

    const tagsContainer = screen.getByTestId('feed-card-tags');
    expect(tagsContainer).toBeInTheDocument();
    expect(tagsContainer.textContent).toContain('seo');
    expect(tagsContainer.textContent).toContain('marketing');
    expect(tagsContainer.textContent).toContain('growth');
  });

  it('should render Approve button that calls onApprove', async () => {
    const onApprove = vi.fn();
    render(FeedCard, {
      props: {
        content: createContent({ id: 'content-42' }),
        showProjectBadge: false,
        onApprove,
        onReject: vi.fn()
      }
    });

    const approveBtn = screen.getByTestId('feed-card-approve-btn');
    expect(approveBtn).toBeInTheDocument();
    await fireEvent.click(approveBtn);
    expect(onApprove).toHaveBeenCalledWith('content-42');
  });

  it('should render Reject button that calls onReject', async () => {
    const onReject = vi.fn();
    render(FeedCard, {
      props: {
        content: createContent({ id: 'content-99' }),
        showProjectBadge: false,
        onApprove: vi.fn(),
        onReject
      }
    });

    const rejectBtn = screen.getByTestId('feed-card-reject-btn');
    expect(rejectBtn).toBeInTheDocument();
    await fireEvent.click(rejectBtn);
    expect(onReject).toHaveBeenCalledWith('content-99');
  });

  it('should render Edit button linking to content editor', () => {
    render(FeedCard, {
      props: {
        content: createContent({ id: 'content-7' }),
        showProjectBadge: false,
        onApprove: vi.fn(),
        onReject: vi.fn()
      }
    });

    const editLink = screen.getByTestId('feed-card-edit-link') as HTMLAnchorElement;
    expect(editLink).toBeInTheDocument();
    expect(editLink.getAttribute('href')).toBe('/dashboard/write/content/content-7');
  });

  it('should show project badge only when showProjectBadge is true', () => {
    const { unmount } = render(FeedCard, {
      props: {
        content: createContent(),
        showProjectBadge: false,
        onApprove: vi.fn(),
        onReject: vi.fn()
      }
    });

    expect(screen.queryByTestId('project-badge')).not.toBeInTheDocument();
    unmount();

    render(FeedCard, {
      props: {
        content: createContent(),
        showProjectBadge: true,
        onApprove: vi.fn(),
        onReject: vi.fn()
      }
    });

    expect(screen.getByTestId('project-badge')).toBeInTheDocument();
  });
});
