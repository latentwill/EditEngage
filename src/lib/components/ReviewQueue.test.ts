/**
 * @behavior ReviewQueue shows pending content items with approve/view actions
 * @business_rule Content review workflow requires a quick-access queue showing
 * items needing attention, scoped by project selection
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import ReviewQueue from './ReviewQueue.svelte';

const mockItems = [
  { id: 'c1', title: 'Article Alpha', status: 'draft' as const, project: { name: 'Blog', color: '#3b82f6' } },
  { id: 'c2', title: 'Article Beta', status: 'in_review' as const, project: { name: 'Marketing', color: '#ef4444' } },
  { id: 'c3', title: 'Article Gamma', status: 'draft' as const, project: { name: 'Blog', color: '#3b82f6' } },
  { id: 'c4', title: 'Article Delta', status: 'in_review' as const, project: { name: 'Docs', color: '#22c55e' } },
  { id: 'c5', title: 'Article Epsilon', status: 'draft' as const, project: { name: 'Blog', color: '#3b82f6' } }
];

describe('ReviewQueue', () => {
  it('should show top 5 pending review items', () => {
    render(ReviewQueue, {
      props: { items: mockItems, showProjectBadge: false }
    });

    const rows = screen.getAllByTestId('review-queue-item');
    expect(rows).toHaveLength(5);
    expect(rows[0].textContent).toContain('Article Alpha');
  });

  it('should limit to 5 items even when more are passed', () => {
    const sixItems = [
      ...mockItems,
      { id: 'c6', title: 'Article Zeta', status: 'draft' as const, project: { name: 'Blog', color: '#3b82f6' } }
    ];

    render(ReviewQueue, {
      props: { items: sixItems, showProjectBadge: false }
    });

    const rows = screen.getAllByTestId('review-queue-item');
    expect(rows).toHaveLength(5);
  });

  it('should show project badge on items when showProjectBadge is true', () => {
    render(ReviewQueue, {
      props: { items: mockItems.slice(0, 2), showProjectBadge: true }
    });

    const badges = screen.getAllByTestId('project-badge');
    expect(badges).toHaveLength(2);
    expect(badges[0].textContent).toContain('Blog');
    expect(badges[1].textContent).toContain('Marketing');
  });

  it('should not show project badge when showProjectBadge is false', () => {
    render(ReviewQueue, {
      props: { items: mockItems.slice(0, 2), showProjectBadge: false }
    });

    expect(screen.queryAllByTestId('project-badge')).toHaveLength(0);
  });

  it('should have "Approve" button for each item', () => {
    render(ReviewQueue, {
      props: { items: mockItems.slice(0, 3), showProjectBadge: false }
    });

    const approveButtons = screen.getAllByTestId('approve-button');
    expect(approveButtons).toHaveLength(3);
    expect(approveButtons[0].textContent).toContain('Approve');
  });

  it('should have "View" button that links to editor', () => {
    render(ReviewQueue, {
      props: { items: mockItems.slice(0, 2), showProjectBadge: false }
    });

    const viewLinks = screen.getAllByTestId('view-button');
    expect(viewLinks).toHaveLength(2);

    const firstLink = viewLinks[0] as HTMLAnchorElement;
    expect(firstLink.getAttribute('href')).toBe('/dashboard/write/content/c1');
    expect(firstLink.textContent).toContain('View');
  });

  it('should have "View All in Feed" link', () => {
    render(ReviewQueue, {
      props: { items: mockItems.slice(0, 1), showProjectBadge: false }
    });

    const viewAllLink = screen.getByTestId('view-all-feed-link');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.textContent).toContain('View All in Feed');
    expect((viewAllLink as HTMLAnchorElement).getAttribute('href')).toContain('pending');
  });
});
