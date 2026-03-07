/**
 * @behavior Delete button on style cards shows confirmation modal and removes style on confirm
 * @business_rule Users can delete any writing style they have access to via project scoping
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
	},
	{
		id: 'style-2',
		project_id: 'proj-1',
		name: 'Casual',
		tone: 'conversational',
		voice_guidelines: null,
		avoid_phrases: [],
		example_content: null,
		created_at: '2024-01-02T00:00:00Z',
		updated_at: '2024-01-02T00:00:00Z'
	}
];

describe('Style delete UI', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it('renders delete button on each style card', async () => {
		const StylesPage = (await import('./+page.svelte')).default;
		render(StylesPage, {
			props: {
				data: { projectId: 'proj-1', writingStyles: mockStyles }
			}
		});

		const deleteButtons = screen.getAllByTestId('delete-style-button');
		expect(deleteButtons).toHaveLength(2);
	});

	it('shows confirmation modal when delete is clicked', async () => {
		const StylesPage = (await import('./+page.svelte')).default;
		render(StylesPage, {
			props: {
				data: { projectId: 'proj-1', writingStyles: mockStyles }
			}
		});

		const deleteButton = screen.getAllByTestId('delete-style-button')[0];
		await fireEvent.click(deleteButton);

		expect(screen.getByTestId('delete-confirm-modal')).toBeInTheDocument();
	});

	it('cancel closes modal without deleting', async () => {
		const StylesPage = (await import('./+page.svelte')).default;
		render(StylesPage, {
			props: {
				data: { projectId: 'proj-1', writingStyles: mockStyles }
			}
		});

		const deleteButton = screen.getAllByTestId('delete-style-button')[0];
		await fireEvent.click(deleteButton);

		const cancelButton = screen.getByTestId('cancel-delete-button');
		await fireEvent.click(cancelButton);

		expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
	});

	it('confirm delete calls API and removes style from list', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true })
		});

		const StylesPage = (await import('./+page.svelte')).default;
		render(StylesPage, {
			props: {
				data: { projectId: 'proj-1', writingStyles: mockStyles }
			}
		});

		const deleteButton = screen.getAllByTestId('delete-style-button')[0];
		await fireEvent.click(deleteButton);

		const confirmButton = screen.getByTestId('confirm-delete-button');
		await fireEvent.click(confirmButton);

		expect(global.fetch).toHaveBeenCalledWith(
			'/api/v1/writing-styles/style-1',
			expect.objectContaining({ method: 'DELETE' })
		);

		await vi.waitFor(() => {
			const cards = screen.getAllByTestId('writing-style-card');
			expect(cards).toHaveLength(1);
		});
	});
});
