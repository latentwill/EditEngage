/**
 * @behavior StatCard renders a Slate & Copper styled card displaying a label,
 * numeric value, and optional trend indicator with directional coloring
 * @business_rule Dashboard metrics need at-a-glance visibility; stat cards
 * must clearly communicate current state and directional trends using the
 * Slate & Copper design system
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

  it('uses daisyUI stat class on the card container', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10' }
    });

    const card = screen.getByTestId('stat-card');
    expect(card.classList.contains('stat')).toBe(true);
  });

  it('uses daisyUI stat-title class on the label', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10' }
    });

    const label = screen.getByTestId('stat-label');
    expect(label.classList.contains('stat-title')).toBe(true);
  });

  it('uses daisyUI stat-value class on the value', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10' }
    });

    const value = screen.getByTestId('stat-value');
    expect(value.classList.contains('stat-value')).toBe(true);
  });

  it('uses daisyUI stat-desc class on the trend indicator', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10', trend: '+5' }
    });

    const trend = screen.getByTestId('stat-trend');
    expect(trend.classList.contains('stat-desc')).toBe(true);
  });

  it('renders value at text-4xl font-bold', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10' }
    });

    const value = screen.getByTestId('stat-value');
    expect(value.classList.contains('text-4xl')).toBe(true);
    expect(value.classList.contains('font-bold')).toBe(true);
  });

  it('renders label in JetBrains Mono uppercase tracking', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10' }
    });

    const label = screen.getByTestId('stat-label');
    expect(label.classList.contains('font-mono')).toBe(true);
    expect(label.classList.contains('text-xs')).toBe(true);
    expect(label.classList.contains('uppercase')).toBe(true);
    expect(label.classList.contains('tracking-widest')).toBe(true);
  });

  it('renders positive trend in copper colour class', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10', trend: '+5' }
    });

    const trend = screen.getByTestId('stat-trend');
    expect(trend.classList.contains('text-primary')).toBe(true);
  });

  it('renders negative trend in error colour class', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10', trend: '-3' }
    });

    const trend = screen.getByTestId('stat-trend');
    expect(trend.classList.contains('text-error')).toBe(true);
  });

  it('does not apply background pill classes to trend', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10', trend: '-3' }
    });

    const trend = screen.getByTestId('stat-trend');
    const classes = Array.from(trend.classList);
    const hasBgClass = classes.some((cls) => cls.startsWith('bg-'));
    expect(hasBgClass).toBe(false);
  });

  it('renders label with text-base-content/40 opacity class', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10' }
    });

    const label = screen.getByTestId('stat-label');
    expect(label.classList.contains('text-base-content/40')).toBe(true);
  });

  it('uses trendDirection prop to determine trend color independently', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10', trend: 'No change', trendDirection: 'up' }
    });

    const trend = screen.getByTestId('stat-trend');
    expect(trend.classList.contains('text-primary')).toBe(true);
  });

  it('applies error color when trendDirection is down', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10', trend: 'Dropped', trendDirection: 'down' }
    });

    const trend = screen.getByTestId('stat-trend');
    expect(trend.classList.contains('text-error')).toBe(true);
  });

  it('applies no directional color when trendDirection is neutral', () => {
    render(StatCard, {
      props: { label: 'Total', value: '10', trend: 'Stable', trendDirection: 'neutral' }
    });

    const trend = screen.getByTestId('stat-trend');
    expect(trend.classList.contains('text-primary')).toBe(false);
    expect(trend.classList.contains('text-error')).toBe(false);
  });
});
