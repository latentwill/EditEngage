/**
 * @behavior GrainOverlay renders an SVG noise texture overlay that covers
 * the full viewport without blocking user interaction
 * @business_rule Visual polish layer - must never interfere with usability
 */
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import GrainOverlay from './GrainOverlay.svelte';

describe('GrainOverlay', () => {
  it('renders an SVG filter element with feTurbulence', () => {
    const { container } = render(GrainOverlay);
    const filter = container.querySelector('filter');
    expect(filter).not.toBeNull();
    const feTurbulence = container.querySelector('feTurbulence');
    expect(feTurbulence).not.toBeNull();
  });

  it('applies pointer-events-none and covers full viewport (fixed, inset-0)', () => {
    const { container } = render(GrainOverlay);
    const overlay = container.querySelector('[class*="pointer-events-none"]');
    expect(overlay).not.toBeNull();
    expect(overlay!.className).toMatch(/fixed/);
    expect(overlay!.className).toMatch(/inset-0/);
  });

  it('has daisyUI theme configured via tailwind.config.ts', () => {
    const configPath = resolve(__dirname, '../../../tailwind.config.ts');
    const config = readFileSync(configPath, 'utf-8');
    expect(config).toContain('daisyui');
    expect(config).toContain('editengage');
    expect(config).toContain('primary');
  });
});
