/**
 * @behavior Select provides an accessible dropdown for choosing from options
 * @business_rule Users must be able to navigate and select options via keyboard
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Select from './Select.svelte';

const testOptions = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

describe('Select', () => {
  it('renders trigger element', () => {
    render(Select, { props: { options: testOptions } });
    expect(screen.getByTestId('select-trigger')).toBeDefined();
  });

  it('opens menu on trigger click', async () => {
    render(Select, { props: { options: testOptions } });
    await fireEvent.click(screen.getByTestId('select-trigger'));
    expect(screen.getByTestId('select-menu')).toBeDefined();
  });

  it('displays all options when open', async () => {
    render(Select, { props: { options: testOptions } });
    await fireEvent.click(screen.getByTestId('select-trigger'));
    const items = screen.getAllByTestId('select-option');
    expect(items.length).toBe(3);
  });

  it('closes on escape without selection', async () => {
    render(Select, { props: { options: testOptions } });
    await fireEvent.click(screen.getByTestId('select-trigger'));
    expect(screen.getByTestId('select-menu')).toBeDefined();
    await fireEvent.keyDown(screen.getByTestId('select-trigger'), { key: 'Escape' });
    expect(screen.queryByTestId('select-menu')).toBeNull();
  });

  it('menu has correct surface styling', async () => {
    render(Select, { props: { options: testOptions } });
    await fireEvent.click(screen.getByTestId('select-trigger'));
    const menu = screen.getByTestId('select-menu');
    expect(menu.className).toContain('bg-base-200');
    expect(menu.className).toContain('rounded-lg');
  });

  it('trigger shows placeholder when no selection', () => {
    render(Select, { props: { options: testOptions, placeholder: 'Choose...' } });
    const trigger = screen.getByTestId('select-trigger');
    expect(trigger.textContent).toContain('Choose...');
  });
});
