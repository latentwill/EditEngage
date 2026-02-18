/**
 * @behavior EditableName displays a name as text and allows inline editing
 * @business_rule Users can rename items inline without navigating away;
 * edits are committed on Enter/blur and cancelled on Escape
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import EditableName from './EditableName.svelte';

describe('EditableName', () => {
  it('should render name as text by default', () => {
    render(EditableName, { props: { value: 'My Project', onSave: vi.fn() } });

    const span = screen.getByText('My Project');
    expect(span).toBeInTheDocument();
    expect(span.tagName).toBe('SPAN');
  });

  it('should switch to input on click', async () => {
    render(EditableName, { props: { value: 'My Project', onSave: vi.fn() } });

    const span = screen.getByText('My Project');
    await fireEvent.click(span);

    const input = screen.getByDisplayValue('My Project');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('should call onSave with new value on Enter', async () => {
    const saveSpy = vi.fn();
    render(EditableName, { props: { value: 'My Project', onSave: saveSpy } });

    const span = screen.getByText('My Project');
    await fireEvent.click(span);

    const input = screen.getByDisplayValue('My Project');
    await fireEvent.input(input, { target: { value: 'Renamed Project' } });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(saveSpy).toHaveBeenCalledWith('Renamed Project');
  });

  it('should revert on Escape', async () => {
    render(EditableName, { props: { value: 'My Project', onSave: vi.fn() } });

    const span = screen.getByText('My Project');
    await fireEvent.click(span);

    const input = screen.getByDisplayValue('My Project');
    await fireEvent.input(input, { target: { value: 'Changed' } });
    await fireEvent.keyDown(input, { key: 'Escape' });

    // Should revert back to text display with original value
    const revertedSpan = screen.getByText('My Project');
    expect(revertedSpan).toBeInTheDocument();
    expect(revertedSpan.tagName).toBe('SPAN');
  });
});
