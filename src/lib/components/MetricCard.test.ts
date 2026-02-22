/**
 * @behavior MetricCard renders a glassmorphism card showing a metric label, value,
 * trend direction, and optional sparkline visualization
 * @business_rule Dashboard metrics require at-a-glance insight; cards must show
 * current value, directional trend with color coding, and optional historical data
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import MetricCard from './MetricCard.svelte';

describe('MetricCard', () => {
  it('should render metric label and value', () => {
    render(MetricCard, {
      props: { label: 'Published This Week', value: '12', trend: 0, sparklineData: [] }
    });

    expect(screen.getByTestId('metric-label').textContent).toBe('Published This Week');
    expect(screen.getByTestId('metric-value').textContent).toBe('12');
  });

  it('should show positive trend with up arrow', () => {
    render(MetricCard, {
      props: { label: 'Views', value: '500', trend: 12.5, sparklineData: [] }
    });

    const trend = screen.getByTestId('metric-trend');
    expect(trend.textContent).toContain('12.5%');
    expect(trend.querySelector('[data-testid="trend-arrow-up"]')).toBeInTheDocument();
    expect(trend.classList.contains('text-success')).toBe(true);
  });

  it('should show negative trend with down arrow', () => {
    render(MetricCard, {
      props: { label: 'Engagement', value: '30', trend: -8.2, sparklineData: [] }
    });

    const trend = screen.getByTestId('metric-trend');
    expect(trend.textContent).toContain('8.2%');
    expect(trend.querySelector('[data-testid="trend-arrow-down"]')).toBeInTheDocument();
    expect(trend.classList.contains('text-error')).toBe(true);
  });

  it('should render sparkline from data points', () => {
    const data = [10, 20, 15, 25, 30];
    render(MetricCard, {
      props: { label: 'Traffic', value: '1.2k', trend: 5, sparklineData: data }
    });

    const sparkline = screen.getByTestId('metric-sparkline');
    expect(sparkline.tagName.toLowerCase()).toBe('svg');
    const polyline = sparkline.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
    // 5 data points = 5 coordinate pairs in the points attribute
    const points = polyline!.getAttribute('points')!.trim().split(' ');
    expect(points).toHaveLength(5);
  });

  it('should not render sparkline when data is empty', () => {
    render(MetricCard, {
      props: { label: 'Empty', value: '0', trend: 0, sparklineData: [] }
    });

    expect(screen.queryByTestId('metric-sparkline')).not.toBeInTheDocument();
  });

  it('should apply glassmorphism styling', () => {
    render(MetricCard, {
      props: { label: 'Styled', value: '99', trend: 1, sparklineData: [] }
    });

    const card = screen.getByTestId('metric-card');
    const classes = card.className;
    expect(classes).toContain('backdrop-blur');
    expect(classes).toContain('bg-base-200/60');
    expect(classes).toContain('border');
  });
});
