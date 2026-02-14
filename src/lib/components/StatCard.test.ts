/**
 * @behavior StatCard renders a glass-styled card displaying a label, numeric
 * value, and optional trend indicator
 * @business_rule Dashboard metrics need at-a-glance visibility; stat cards
 * must clearly communicate current state and directional trends
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import StatCard from './StatCard.svelte';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(StatCard, {
      props: { label: 'Total Content', value: '42' }
    });

    expect(screen.getByTestId('stat-card')).toBeInTheDocument();
    expect(screen.getByTestId('stat-label').textContent).toBe('Total Content');
    expect(screen.getByTestId('stat-value').textContent).toBe('42');
  });

  it('renders trend indicator when provided', () => {
    render(StatCard, {
      props: { label: 'Published', value: '12', trend: '+3' }
    });

    const trend = screen.getByTestId('stat-trend');
    expect(trend).toBeInTheDocument();
    expect(trend.textContent).toContain('+3');
  });

  it('does not render trend indicator when not provided', () => {
    render(StatCard, {
      props: { label: 'Pending', value: '5' }
    });

    expect(screen.queryByTestId('stat-trend')).not.toBeInTheDocument();
  });
});
