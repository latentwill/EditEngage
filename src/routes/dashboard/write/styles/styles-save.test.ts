/**
 * @behavior Saving a writing style adds it to the displayed list and shows errors on failure
 * @business_rule Users get immediate feedback when creating styles — success refreshes the list, failure shows an error message
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStyles = [
	{
		id: 'style-1',
		project_id: 'proj-1',
		name: 'Professional',
		tone: 'authoritative',
		voice_guidelines: null,
		avoid_phrases: [],
		example_content: null,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	}
];

describe('Style save feedback', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it('successful save adds style to displayed list', async () => {
		const newStyle = {
			id: 'style-2',
			project_id: 'proj-1',
			name: 'Casual',
			tone: 'conversational',
			voice_guidelines: null,
			avoid_phrases: [],
			example_content: null,
			created_at: '2024-01-02T00:00:00Z',
			updated_at: '2024-01-02T00:00:00Z'
		};

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: newStyle })
		});

		const StylesPage = (await import('./+page.svelte')).default;
		render(StylesPage, {
			props: {
				data: { projectId: 'proj-1', writingStyles: mockStyles }
			}
		});

		// Open form
		const createButton = screen.getByText('Create Style');
		await fireEvent.click(createButton);

		// Fill name
		const nameInput = screen.getByLabelText('Style Name');
		await fireEvent.input(nameInput, { target: { value: 'Casual' } });

		// Submit
		const saveButton = screen.getByText('Save Style');
		await fireEvent.click(saveButton);

		// Wait for fetch to resolve
		await vi.waitFor(() => {
			const cards = screen.getAllByTestId('writing-style-card');
			expect(cards).toHaveLength(2);
		});
	});

	it('failed save shows error message', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ error: 'name is required' })
		});

		const StylesPage = (await import('./+page.svelte')).default;
		render(StylesPage, {
			props: {
				data: { projectId: 'proj-1', writingStyles: mockStyles }
			}
		});

		// Open form
		const createButton = screen.getByText('Create Style');
		await fireEvent.click(createButton);

		// Submit without name
		const saveButton = screen.getByText('Save Style');
		await fireEvent.click(saveButton);

		await vi.waitFor(() => {
			expect(screen.getByTestId('style-save-error')).toBeInTheDocument();
		});
	});

	it('failed save keeps form open', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ error: 'Server error' })
		});

		const StylesPage = (await import('./+page.svelte')).default;
		render(StylesPage, {
			props: {
				data: { projectId: 'proj-1', writingStyles: mockStyles }
			}
		});

		const createButton = screen.getByText('Create Style');
		await fireEvent.click(createButton);

		const saveButton = screen.getByText('Save Style');
		await fireEvent.click(saveButton);

		await vi.waitFor(() => {
			expect(screen.getByText('Save Style')).toBeInTheDocument();
		});
	});
});
