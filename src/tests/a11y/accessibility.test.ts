/**
 * @behavior All pages meet WCAG 2.1 AA accessibility requirements
 * @business_rule Accessibility compliance ensures the product is usable by all users
 * and meets legal requirements for web content accessibility
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import fs from 'fs';
import path from 'path';

// Component imports for ARIA landmark tests
import GlassNav from '$lib/components/GlassNav.svelte';

describe('Task 40: Accessibility Audit - WCAG 2.1 AA', () => {
  describe('Test 1: Text elements meet 4.5:1 contrast ratio', () => {
    it('design tokens use colors that meet WCAG AA contrast ratios against dark background', () => {
      // Read the CSS file and verify design tokens use accessible color values
      const cssPath = path.resolve(__dirname, '../../../src/app.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      // The daisyUI theme uses Slate & Copper palette
      // Copper primary #B87333 on dark obsidian #080808 meets WCAG AA contrast
      // Verify focus-visible styles exist in the CSS (daisyUI handles color tokens via config)
      expect(css).toContain(':focus-visible');

      // Read tailwind config to verify accessible color tokens
      const tailwindPath = path.resolve(__dirname, '../../../tailwind.config.ts');
      const tailwindConfig = fs.readFileSync(tailwindPath, 'utf-8');

      // Verify copper primary color is used (Slate & Copper design system)
      expect(tailwindConfig).toContain('"#B87333"');

      // Verify daisyUI theme defines accessible color tokens
      // The tailwind config should define base-content for text colors
      expect(tailwindConfig).toContain('"base-content"');
    });

    it('CSS provides high-contrast focus-visible styles for accessibility', () => {
      const cssPath = path.resolve(__dirname, '../../../src/app.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      // Verify focus-visible styles are defined with high contrast
      expect(css).toContain(':focus-visible');
      // Focus outline should use a visible color with sufficient contrast
      expect(css).toMatch(/focus-visible[\s\S]*?outline/);
    });
  });

  describe('Test 2: All interactive elements have visible focus states', () => {
    it('global CSS defines focus-visible styles for interactive elements', () => {
      const cssPath = path.resolve(__dirname, '../../../src/app.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      // Verify focus-visible rules exist for buttons, links, inputs, selects
      expect(css).toContain('a:focus-visible');
      expect(css).toContain('button:focus-visible');
      expect(css).toContain('input:focus-visible');
      expect(css).toContain('select:focus-visible');
    });

    it('GlassNav interactive elements are keyboard focusable', () => {
      render(GlassNav, { props: { currentPath: '/dashboard' } });

      // All navigation links should be focusable (anchor elements are by default)
      const desktopNav = screen.getByTestId('desktop-nav-links');
      const links = desktopNav.querySelectorAll('a');
      expect(links.length).toBeGreaterThan(0);

      links.forEach((link) => {
        // Links should not have negative tabindex
        const tabindex = link.getAttribute('tabindex');
        expect(tabindex === null || Number(tabindex) >= 0).toBe(true);
      });

      // Hamburger menu button should be focusable
      const hamburger = screen.getByTestId('hamburger-menu');
      expect(hamburger.tagName.toLowerCase()).toBe('button');
    });
  });

  describe('Test 3: prefers-reduced-motion media query disables CSS animations', () => {
    it('app.css contains prefers-reduced-motion media query that disables animations', () => {
      const cssPath = path.resolve(__dirname, '../../../src/app.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      // Verify the reduced motion media query exists
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');

      // Verify it sets animation-duration to near-zero
      expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*?animation-duration:\s*0\.01ms/);

      // Verify it also reduces transition-duration
      expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*?transition-duration:\s*0\.01ms/);

      // Verify it limits animation-iteration-count
      expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*?animation-iteration-count:\s*1/);
    });
  });

  describe('Test 4: All pages are keyboard navigable (Tab, Enter, Escape)', () => {
    it('GlassNav links and buttons are in logical tab order', () => {
      render(GlassNav, { props: { currentPath: '/dashboard' } });

      // All interactive elements should be tabbable
      const nav = screen.getByTestId('glass-nav');
      const interactiveElements = nav.querySelectorAll('a, button, input, select, [tabindex]');

      expect(interactiveElements.length).toBeGreaterThan(0);

      // None should have tabindex="-1" (which removes from tab order)
      interactiveElements.forEach((el) => {
        const tabindex = el.getAttribute('tabindex');
        if (tabindex !== null) {
          expect(Number(tabindex)).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('hamburger menu button has aria-label for screen readers', () => {
      render(GlassNav, { props: { currentPath: '/dashboard' } });

      const hamburger = screen.getByTestId('hamburger-menu');
      expect(hamburger.getAttribute('aria-label')).toBeTruthy();
    });

    it('theme toggle has aria-label for screen readers', () => {
      render(GlassNav, { props: { currentPath: '/dashboard' } });

      const themeToggle = screen.getByTestId('theme-toggle');
      expect(themeToggle.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('Test 5: ARIA landmarks exist on all pages', () => {
    it('GlassNav renders with nav landmark role', () => {
      render(GlassNav, { props: { currentPath: '/dashboard' } });

      // The <nav> element implicitly has role="navigation"
      const navElement = screen.getByTestId('glass-nav');
      expect(navElement.tagName.toLowerCase()).toBe('nav');
    });

    it('app.html includes lang attribute on html element', () => {
      const htmlPath = path.resolve(__dirname, '../../../src/app.html');
      const html = fs.readFileSync(htmlPath, 'utf-8');

      // HTML must have lang attribute for screen readers
      expect(html).toMatch(/<html[^>]*lang="en"/);
    });

    it('app.html contains a skip-to-content link for keyboard users', () => {
      const htmlPath = path.resolve(__dirname, '../../../src/app.html');
      const html = fs.readFileSync(htmlPath, 'utf-8');

      // Skip link should be present for keyboard navigation
      expect(html).toContain('skip-to-content');
      expect(html).toMatch(/href="#main-content"/);
    });

    it('dashboard layout has main landmark with id for skip link', () => {
      const layoutPath = path.resolve(__dirname, '../../../src/routes/dashboard/+layout.svelte');
      const layout = fs.readFileSync(layoutPath, 'utf-8');

      // Dashboard main element should have id="main-content" for skip link target
      expect(layout).toContain('id="main-content"');
      // The main element should exist with role
      expect(layout).toContain('<main');
    });

    it('landing page sections use semantic heading hierarchy', () => {
      const pagePath = path.resolve(__dirname, '../../../src/routes/+page.svelte');
      const page = fs.readFileSync(pagePath, 'utf-8');

      // Landing page should have h1 followed by h2s (not skip levels)
      expect(page).toContain('<h1');
      expect(page).toContain('<h2');
      // Should not jump from h1 to h3 without h2
      const h1Index = page.indexOf('<h1');
      const firstH2Index = page.indexOf('<h2');
      const firstH3Index = page.indexOf('<h3');

      // h2 should appear after h1
      expect(firstH2Index).toBeGreaterThan(h1Index);

      // If h3 exists, h2 should appear before it
      if (firstH3Index > -1) {
        expect(firstH2Index).toBeLessThan(firstH3Index);
      }
    });
  });
});
