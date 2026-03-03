/**
 * @behavior OrchestrationFeed renders a chronological agent activity stream
 * showing module badges, event descriptions, timestamps, and artifact links
 * @business_rule Operators need real-time visibility into orchestration activity
 * to monitor agent progress and quickly navigate to produced artifacts
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OrchestrationFeed from './OrchestrationFeed.svelte';
import type { EventRow } from '$lib/stores/events.js';

function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: 'evt-1',
    project_id: 'proj-1',
    event_type: 'research.completed',
    description: 'Research completed',
    metadata: {},
    is_read: false,
    created_at: new Date().toISOString(),
    agent_id: null,
    module: 'research',
    payload_summary: 'Analysed 12 sources',
    artifact_link: null,
    ...overrides
  };
}

describe('OrchestrationFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders event items from props', () => {
    const events = [
      makeEvent({ id: 'evt-1', payload_summary: 'First event' }),
      makeEvent({ id: 'evt-2', payload_summary: 'Second event' })
    ];

    render(OrchestrationFeed, { props: { events } });

    const items = screen.getAllByTestId('orchestration-event-item');
    expect(items).toHaveLength(2);
  });

  it('shows module badge with blue styling for research module', () => {
    const events = [makeEvent({ module: 'research' })];

    render(OrchestrationFeed, { props: { events } });

    const badge = screen.getByTestId('module-badge');
    expect(badge.textContent?.trim()).toBe('research');
    expect(badge.classList.contains('badge-info')).toBe(true);
  });

  it('shows module badge with purple styling for writing module', () => {
    const events = [makeEvent({ module: 'writing' })];

    render(OrchestrationFeed, { props: { events } });

    const badge = screen.getByTestId('module-badge');
    expect(badge.textContent?.trim()).toBe('writing');
    expect(badge.classList.contains('badge-secondary')).toBe(true);
  });

  it('shows module badge with green styling for publish module', () => {
    const events = [makeEvent({ module: 'publish' })];

    render(OrchestrationFeed, { props: { events } });

    const badge = screen.getByTestId('module-badge');
    expect(badge.textContent?.trim()).toBe('publish');
    expect(badge.classList.contains('badge-success')).toBe(true);
  });

  it('shows module badge with ghost styling for system module', () => {
    const events = [makeEvent({ module: 'system' })];

    render(OrchestrationFeed, { props: { events } });

    const badge = screen.getByTestId('module-badge');
    expect(badge.textContent?.trim()).toBe('system');
    expect(badge.classList.contains('badge-ghost')).toBe(true);
  });

  it('shows payload_summary as description text', () => {
    const events = [makeEvent({ payload_summary: 'Analysed 12 sources' })];

    render(OrchestrationFeed, { props: { events } });

    const desc = screen.getByTestId('event-description');
    expect(desc.textContent).toBe('Analysed 12 sources');
  });

  it('shows relative timestamp for a recent event', () => {
    const twoMinutesAgo = new Date('2026-03-03T11:58:00Z').toISOString();
    const events = [makeEvent({ created_at: twoMinutesAgo })];

    render(OrchestrationFeed, { props: { events } });

    const timestamp = screen.getByTestId('event-timestamp');
    expect(timestamp.textContent).toBe('2m ago');
  });

  it('shows "View" link when artifact_link is present', () => {
    const events = [makeEvent({ artifact_link: '/content/abc' })];

    render(OrchestrationFeed, { props: { events } });

    const link = screen.getByTestId('artifact-link');
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/content/abc');
    expect(link.textContent?.trim()).toContain('View');
  });

  it('hides "View" link when artifact_link is null', () => {
    const events = [makeEvent({ artifact_link: null })];

    render(OrchestrationFeed, { props: { events } });

    expect(screen.queryByTestId('artifact-link')).not.toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    render(OrchestrationFeed, { props: { events: [] } });

    const empty = screen.getByTestId('orchestration-feed-empty');
    expect(empty.textContent).toContain('No activity yet');
  });

  it('shows event type as action label', () => {
    const events = [makeEvent({ event_type: 'research.completed' })];

    render(OrchestrationFeed, { props: { events } });

    const label = screen.getByTestId('event-type-label');
    expect(label.textContent?.trim()).toBe('research.completed');
  });

  it('shows agent indicator when agent_id is present', () => {
    const events = [makeEvent({ agent_id: 'agent-123' })];

    render(OrchestrationFeed, { props: { events } });

    const indicator = screen.getByTestId('agent-indicator');
    expect(indicator.textContent?.trim()).toBe('Agent');
  });

  it('hides agent indicator when agent_id is null', () => {
    const events = [makeEvent({ agent_id: null })];

    render(OrchestrationFeed, { props: { events } });

    expect(screen.queryByTestId('agent-indicator')).not.toBeInTheDocument();
  });
});
