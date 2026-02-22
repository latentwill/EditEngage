/**
 * @behavior Combobox provides searchable dropdown with type-ahead filtering
 * @business_rule Users can filter large option lists by typing, with clear empty state
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Combobox from './Combobox.svelte';

const testOptions = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

async function openCombobox(): Promise<HTMLElement> {
  const input = screen.getByTestId('combobox-input');
  await fireEvent.click(input);
  return input;
}

describe('Combobox', () => {
  it('renders input element', () => {
    render(Combobox, { props: { options: testOptions } });
    expect(screen.getByTestId('combobox-input')).toBeDefined();
  });

  it('shows options when input is clicked', async () => {
    render(Combobox, { props: { options: testOptions } });
    await openCombobox();
    expect(screen.getByTestId('combobox-menu')).toBeDefined();
  });

  it('filters options when typing', async () => {
    render(Combobox, { props: { options: testOptions } });
    const input = await openCombobox();
    await fireEvent.input(input, { target: { value: 'App' } });
    const items = screen.getAllByTestId('combobox-option');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Apple');
  });

  it('shows empty state when no match', async () => {
    render(Combobox, { props: { options: testOptions } });
    const input = await openCombobox();
    await fireEvent.input(input, { target: { value: 'xyz' } });
    const empty = screen.getByTestId('combobox-empty');
    expect(empty).toBeDefined();
    expect(empty.textContent).toContain('No results');
  });

  it('menu has correct surface styling', async () => {
    render(Combobox, { props: { options: testOptions } });
    await openCombobox();
    const menu = screen.getByTestId('combobox-menu');
    expect(menu.className).toContain('bg-base-200');
    expect(menu.className).toContain('rounded-lg');
  });
});
