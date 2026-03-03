/**
 * @behavior Saved API keys show deactivate toggle and delete button; unsaved keys do not
 * @business_rule Users can deactivate (PATCH) or delete (DELETE) existing API keys.
 *   Delete requires confirmation dialog. Only saved keys (with an id) show these actions.
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost:54321',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));
vi.mock('$env/static/private', () => ({
	SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));
vi.mock('$lib/supabase', () => ({
	createSupabaseClient: vi.fn(() => ({}))
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const savedKey = {
	id: 'key-1',
	project_id: 'proj-1',
	provider: 'openrouter' as const,
	api_key: 'sk-o****f456',
	is_active: true,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
};

const inactiveKey = {
	id: 'key-2',
	project_id: 'proj-1',
	provider: 'perplexity' as const,
	api_key: 'pplx****mnop',
	is_active: false,
	created_at: '2024-01-02T00:00:00Z',
	updated_at: '2024-01-02T00:00:00Z'
};

describe('Connections Page — API Key Actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({})
		});
	});

	it('shows deactivate toggle and delete button for saved keys', async () => {
		const ConnectionsPage = (await import('./+page.svelte')).default;
		render(ConnectionsPage, {
			props: { data: { projectId: 'proj-1', apiKeys: [savedKey] } }
		});

		expect(screen.getByTestId('api-key-deactivate-openrouter')).toBeInTheDocument();
		expect(screen.getByTestId('api-key-delete-openrouter')).toBeInTheDocument();
	});

	it('does not show deactivate or delete for providers without a saved key', async () => {
		const ConnectionsPage = (await import('./+page.svelte')).default;
		render(ConnectionsPage, {
			props: { data: { projectId: 'proj-1', apiKeys: [] } }
		});

		expect(screen.queryByTestId('api-key-deactivate-tavily')).not.toBeInTheDocument();
		expect(screen.queryByTestId('api-key-delete-tavily')).not.toBeInTheDocument();
	});

	it('sends PATCH to toggle active state when deactivate is clicked', async () => {
		const ConnectionsPage = (await import('./+page.svelte')).default;
		render(ConnectionsPage, {
			props: { data: { projectId: 'proj-1', apiKeys: [savedKey] } }
		});

		const toggle = screen.getByTestId('api-key-deactivate-openrouter');
		await fireEvent.click(toggle);

		expect(mockFetch).toHaveBeenCalledWith(
			'/api/v1/api-keys/key-1',
			expect.objectContaining({
				method: 'PATCH',
				body: JSON.stringify({ is_active: false })
			})
		);
	});

	it('sends PATCH with is_active true for an inactive key', async () => {
		const ConnectionsPage = (await import('./+page.svelte')).default;
		render(ConnectionsPage, {
			props: { data: { projectId: 'proj-1', apiKeys: [inactiveKey] } }
		});

		const toggle = screen.getByTestId('api-key-deactivate-perplexity');
		await fireEvent.click(toggle);

		expect(mockFetch).toHaveBeenCalledWith(
			'/api/v1/api-keys/key-2',
			expect.objectContaining({
				method: 'PATCH',
				body: JSON.stringify({ is_active: true })
			})
		);
	});

	it('shows confirmation dialog before delete and sends DELETE on confirm', async () => {
		const confirmSpy = vi.fn(() => true);
		vi.stubGlobal('confirm', confirmSpy);

		const ConnectionsPage = (await import('./+page.svelte')).default;
		render(ConnectionsPage, {
			props: { data: { projectId: 'proj-1', apiKeys: [savedKey] } }
		});

		const deleteBtn = screen.getByTestId('api-key-delete-openrouter');
		await fireEvent.click(deleteBtn);

		expect(confirmSpy).toHaveBeenCalled();
		expect(mockFetch).toHaveBeenCalledWith(
			'/api/v1/api-keys/key-1',
			expect.objectContaining({ method: 'DELETE' })
		);
	});

	it('does not send DELETE when confirmation is cancelled', async () => {
		const confirmSpy = vi.fn(() => false);
		vi.stubGlobal('confirm', confirmSpy);

		const ConnectionsPage = (await import('./+page.svelte')).default;
		render(ConnectionsPage, {
			props: { data: { projectId: 'proj-1', apiKeys: [savedKey] } }
		});

		const deleteBtn = screen.getByTestId('api-key-delete-openrouter');
		await fireEvent.click(deleteBtn);

		expect(confirmSpy).toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalledWith(
			'/api/v1/api-keys/key-1',
			expect.objectContaining({ method: 'DELETE' })
		);
	});
});
