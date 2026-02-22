/**
 * @behavior ProjectBadge renders a color-coded pill displaying a project name
 * @business_rule Projects need visual identity; badges must be readable against
 * their background color and handle long names gracefully
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import ProjectBadge from './ProjectBadge.svelte';

describe('ProjectBadge', () => {
  it('should render project name in a pill/badge', () => {
    render(ProjectBadge, {
      props: { project: { name: 'My Project', color: '#3b82f6' } }
    });

    const badge = screen.getByTestId('project-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('My Project');
  });

  it('should apply project color as background', () => {
    render(ProjectBadge, {
      props: { project: { name: 'Design', color: '#ef4444' } }
    });

    const badge = screen.getByTestId('project-badge');
    expect(badge.style.backgroundColor).toBe('rgb(239, 68, 68)');
  });

  it('should truncate long project names', () => {
    render(ProjectBadge, {
      props: { project: { name: 'This Is A Very Long Project Name Indeed', color: '#22c55e' } }
    });

    const badge = screen.getByTestId('project-badge');
    const text = badge.textContent!.trim();
    expect(text.length).toBeLessThanOrEqual(23); // 20 chars + '...'
    expect(text).toContain('...');
  });

  it('should not truncate names that are 20 chars or fewer', () => {
    render(ProjectBadge, {
      props: { project: { name: 'Exactly Twenty Chars', color: '#3b82f6' } }
    });

    const badge = screen.getByTestId('project-badge');
    const text = badge.textContent!.trim();
    expect(text).toBe('Exactly Twenty Chars');
    expect(text).not.toContain('...');
  });

  it('should be accessible with sufficient contrast - light background gets dark text', () => {
    render(ProjectBadge, {
      props: { project: { name: 'Light BG', color: '#fbbf24' } }
    });

    const badge = screen.getByTestId('project-badge');
    // Yellow background (#fbbf24) is light, should get dark text
    expect(badge.style.color).toBe('rgb(0, 0, 0)');
  });

  it('should be accessible with sufficient contrast - dark background gets light text', () => {
    render(ProjectBadge, {
      props: { project: { name: 'Dark BG', color: '#1e3a5f' } }
    });

    const badge = screen.getByTestId('project-badge');
    // Dark blue background should get white text
    expect(badge.style.color).toBe('rgb(255, 255, 255)');
  });
});
