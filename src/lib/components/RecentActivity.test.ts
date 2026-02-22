/**
 * @behavior RecentActivity shows a list of recent events with timestamps
 * @business_rule Users need visibility into recent actions across the system
 * to maintain awareness of content pipeline activity
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import RecentActivity from './RecentActivity.svelte';

const mockEvents = [
  { id: 'e1', description: 'Article "SEO Guide" published', timestamp: '2026-02-22T10:30:00Z' },
  { id: 'e2', description: 'Pipeline "Weekly Blog" completed', timestamp: '2026-02-22T09:15:00Z' },
  { id: 'e3', description: 'Content "Landing Page" moved to review', timestamp: '2026-02-21T16:00:00Z' }
];

describe('RecentActivity', () => {
  it('should show recent activity events', () => {
    render(RecentActivity, { props: { events: mockEvents } });

    const items = screen.getAllByTestId('activity-event');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain('SEO Guide');
  });

  it('should show timestamps for each event', () => {
    render(RecentActivity, { props: { events: mockEvents } });

    const timestamps = screen.getAllByTestId('activity-timestamp');
    expect(timestamps).toHaveLength(3);
    // Timestamps should be rendered (we don't care about exact format)
    expect(timestamps[0].textContent!.trim().length).toBeGreaterThan(0);
  });

  it('should render a heading', () => {
    render(RecentActivity, { props: { events: mockEvents } });

    const heading = screen.getByTestId('recent-activity-heading');
    expect(heading.textContent).toContain('Recent Activity');
  });

  it('should handle empty events gracefully', () => {
    render(RecentActivity, { props: { events: [] } });

    const heading = screen.getByTestId('recent-activity-heading');
    expect(heading).toBeInTheDocument();
    expect(screen.queryAllByTestId('activity-event')).toHaveLength(0);
  });
});
