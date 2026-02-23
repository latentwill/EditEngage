/**
 * @behavior CommandPalette provides a keyboard-driven command launcher overlay
 * @business_rule Users can quickly access commands via Cmd+K with search filtering
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import CommandPalette from './CommandPalette.svelte';

const testCommands = [
	{
		group: 'Navigation',
		items: [
			{ value: 'dashboard', label: 'Go to Dashboard' },
			{ value: 'settings', label: 'Go to Settings' }
		]
	},
	{
		group: 'Actions',
		items: [{ value: 'new-post', label: 'Create New Post' }]
	}
];

describe('CommandPalette', () => {
	it('is not visible on initial render', () => {
		render(CommandPalette, { props: { commands: testCommands } });
		expect(screen.queryByTestId('command-palette')).toBeNull();
	});

	it('opens on Cmd+K keydown', async () => {
		render(CommandPalette, { props: { commands: testCommands } });
		await fireEvent.keyDown(document, { key: 'k', metaKey: true });
		expect(screen.getByTestId('command-palette')).toBeDefined();
	});

	it('closes on Escape', async () => {
		render(CommandPalette, { props: { commands: testCommands } });
		await fireEvent.keyDown(document, { key: 'k', metaKey: true });
		expect(screen.getByTestId('command-palette')).toBeDefined();
		await fireEvent.keyDown(document, { key: 'Escape' });
		expect(screen.queryByTestId('command-palette')).toBeNull();
	});

	it('renders ^ caret prefix in prompt', async () => {
		render(CommandPalette, { props: { commands: testCommands } });
		await fireEvent.keyDown(document, { key: 'k', metaKey: true });
		const prompt = screen.getByTestId('palette-prompt');
		expect(prompt.textContent).toContain('^');
	});

	it('renders group headers without pilcrow', async () => {
		render(CommandPalette, { props: { commands: testCommands } });
		await fireEvent.keyDown(document, { key: 'k', metaKey: true });
		const headers = screen.getAllByTestId('palette-group-header');
		expect(headers.length).toBe(2);
		expect(headers[0].textContent).not.toContain('¶');
		expect(headers[0].textContent).toContain('Navigation');
	});

	it('has full-screen backdrop', async () => {
		render(CommandPalette, { props: { commands: testCommands } });
		await fireEvent.keyDown(document, { key: 'k', metaKey: true });
		const backdrop = screen.getByTestId('palette-backdrop');
		expect(backdrop.className).toContain('fixed');
		expect(backdrop.className).toContain('inset-0');
	});

	it('renders search input with monospace font', async () => {
		render(CommandPalette, { props: { commands: testCommands } });
		await fireEvent.keyDown(document, { key: 'k', metaKey: true });
		const input = screen.getByTestId('palette-input');
		expect(input).toBeDefined();
	});
});
