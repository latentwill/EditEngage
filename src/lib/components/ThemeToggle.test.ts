/**
 * @behavior ThemeToggle allows users to switch between light and dark themes
 * @business_rule User theme preference persists across sessions via localStorage
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ThemeToggle from './ThemeToggle.svelte';

function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
}

describe('ThemeToggle', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  it('renders a button with accessible aria-label', () => {
    render(ThemeToggle);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button.getAttribute('aria-label')).toBeTruthy();
  });

  it('clicking toggles dark class on document.documentElement', async () => {
    document.documentElement.classList.add('dark');
    render(ThemeToggle);
    const button = screen.getByRole('button');

    await fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    await fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('reads saved preference from localStorage on mount', () => {
    mockStorage.setItem('theme', 'light');
    render(ThemeToggle);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('defaults to dark mode when no preference is saved', () => {
    render(ThemeToggle);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
