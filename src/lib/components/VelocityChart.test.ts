/**
 * @behavior VelocityChart renders an SVG area chart showing 30-day content velocity
 * @business_rule Users need to see publishing trends over the last 30 days
 * to understand content production patterns
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import VelocityChart from './VelocityChart.svelte';

describe('VelocityChart', () => {
  it('should render 30-day content velocity area chart', () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      count: Math.floor(Math.random() * 10)
    }));

    render(VelocityChart, { props: { data } });

    const chart = screen.getByTestId('velocity-chart');
    expect(chart).toBeInTheDocument();
    expect(chart.tagName.toLowerCase()).toBe('svg');

    // Should have an area path (filled) and a line path (stroke)
    const paths = chart.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it('should render with empty data without crashing', () => {
    render(VelocityChart, { props: { data: [] } });

    const chart = screen.getByTestId('velocity-chart');
    expect(chart).toBeInTheDocument();
  });

  it('should render a heading', () => {
    const data = [{ date: '2026-01-01', count: 5 }];
    render(VelocityChart, { props: { data } });

    const heading = screen.getByTestId('velocity-chart-heading');
    expect(heading.textContent).toContain('Content Velocity');
  });
});
