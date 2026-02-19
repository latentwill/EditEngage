/**
 * @behavior SidebarDrawer wraps the Sidebar in a DaisyUI drawer component
 * for mobile responsiveness with hamburger toggle and backdrop overlay.
 * @business_rule On mobile, sidebar slides in as a drawer; on desktop, it
 * renders inline. Drawer closes when a nav link is clicked.
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import SidebarDrawer from './SidebarDrawer.svelte';

describe('SidebarDrawer — Mobile Navigation', () => {
  it('should render hamburger button for mobile', () => {
    render(SidebarDrawer, { props: { currentPath: '/dashboard' } });

    const hamburger = screen.getByTestId('sidebar-hamburger');
    expect(hamburger).toBeInTheDocument();
    expect(hamburger.getAttribute('aria-label')).toBe('Open navigation');
  });

  it('should use DaisyUI drawer component', () => {
    render(SidebarDrawer, { props: { currentPath: '/dashboard' } });

    const drawer = screen.getByTestId('sidebar-drawer');
    expect(drawer).toBeInTheDocument();
    expect(drawer.className).toContain('drawer');
  });

  it('should have backdrop overlay element', () => {
    render(SidebarDrawer, { props: { currentPath: '/dashboard' } });

    const overlay = screen.getByTestId('sidebar-drawer-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay.className).toContain('drawer-overlay');
  });

  it('should render sidebar content inside drawer-side', () => {
    render(SidebarDrawer, { props: { currentPath: '/dashboard' } });

    const drawerSide = screen.getByTestId('sidebar-drawer-side');
    expect(drawerSide).toBeInTheDocument();
    expect(drawerSide.className).toContain('drawer-side');

    // Sidebar should be inside the drawer
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toBeInTheDocument();
  });

  it('should render main content area', () => {
    render(SidebarDrawer, { props: { currentPath: '/dashboard' } });

    const content = screen.getByTestId('sidebar-drawer-content');
    expect(content).toBeInTheDocument();
    expect(content.className).toContain('drawer-content');
  });
});
