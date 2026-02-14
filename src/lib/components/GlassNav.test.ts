/**
 * @behavior GlassNav renders a glassmorphism top navigation bar with logo,
 * nav links, theme toggle, avatar, hamburger menu, and project switcher slot
 * @business_rule Navigation provides consistent wayfinding across all dashboard pages
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import GlassNav from './GlassNav.svelte';

describe('GlassNav', () => {
  it('renders logo, nav links, and avatar placeholder', () => {
    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const nav = screen.getByTestId('glass-nav');
    expect(nav).toBeInTheDocument();

    // Logo text
    expect(screen.getByText('EditEngage')).toBeInTheDocument();

    // Nav links (appear in both desktop and mobile nav)
    const desktopNav = screen.getByTestId('desktop-nav-links');
    expect(desktopNav.querySelector('a[href="/dashboard"]')).not.toBeNull();
    expect(desktopNav.querySelector('a[href="/dashboard/pipelines"]')).not.toBeNull();
    expect(desktopNav.querySelector('a[href="/dashboard/content"]')).not.toBeNull();
    expect(desktopNav.querySelector('a[href="/dashboard/topics"]')).not.toBeNull();
    expect(desktopNav.querySelector('a[href="/dashboard/settings"]')).not.toBeNull();

    // Avatar placeholder
    expect(screen.getByTestId('avatar-placeholder')).toBeInTheDocument();
  });

  it('nav links have correct hrefs', () => {
    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const links = screen.getByTestId('desktop-nav-links').querySelectorAll('a');
    const hrefs = Array.from(links).map((link) => link.getAttribute('href'));

    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/dashboard/pipelines');
    expect(hrefs).toContain('/dashboard/content');
    expect(hrefs).toContain('/dashboard/topics');
    expect(hrefs).toContain('/dashboard/settings');
  });

  it('highlights active nav link based on currentPath prop', () => {
    render(GlassNav, { props: { currentPath: '/dashboard/pipelines' } });

    const links = screen.getByTestId('desktop-nav-links').querySelectorAll('a');
    const pipelinesLink = Array.from(links).find(
      (link) => link.getAttribute('href') === '/dashboard/pipelines'
    );
    const dashboardLink = Array.from(links).find(
      (link) => link.getAttribute('href') === '/dashboard'
    );

    expect(pipelinesLink?.getAttribute('aria-current')).toBe('page');
    expect(dashboardLink?.getAttribute('aria-current')).toBeNull();
  });

  it('renders a slot for project switcher', () => {
    const { container } = render(GlassNav, {
      props: { currentPath: '/dashboard' }
    });

    const slot = container.querySelector('[data-testid="project-switcher-slot"]');
    expect(slot).toBeInTheDocument();
  });

  it('renders hamburger menu button on mobile', () => {
    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const hamburger = screen.getByTestId('hamburger-menu');
    expect(hamburger).toBeInTheDocument();
  });

  it('hamburger menu toggles nav visibility', async () => {
    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const hamburger = screen.getByTestId('hamburger-menu');
    const mobileNav = screen.getByTestId('mobile-nav');

    // Initially hidden
    expect(mobileNav.classList.contains('hidden')).toBe(true);

    // Click to show
    await fireEvent.click(hamburger);
    expect(mobileNav.classList.contains('hidden')).toBe(false);

    // Click again to hide
    await fireEvent.click(hamburger);
    expect(mobileNav.classList.contains('hidden')).toBe(true);
  });
});
