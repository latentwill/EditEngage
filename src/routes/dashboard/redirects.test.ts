/**
 * @behavior Old routes redirect to new locations to prevent broken bookmarks
 * @business_rule URL stability: old bookmarked URLs gracefully redirect to new routes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock SvelteKit redirect
const mockRedirect = vi.fn();
vi.mock('@sveltejs/kit', () => ({
	redirect: (...args: unknown[]) => {
		mockRedirect(...args);
		throw { status: 301, location: args[1] }; // SvelteKit redirect throws
	}
}));

// Mock Supabase env vars
vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost:54321',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));
vi.mock('$env/static/private', () => ({
	SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

describe('Route Redirects', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('/dashboard/content redirects to /dashboard/write/content', async () => {
		const { load } = await import('./content/+page.server.js');

		await expect(load({} as never)).rejects.toMatchObject({
			status: 301,
			location: '/dashboard/write/content'
		});
	});

	it('/dashboard/topics redirects to /dashboard/write/topics', async () => {
		const { load } = await import('./topics/+page.server.js');

		await expect(load({} as never)).rejects.toMatchObject({
			status: 301,
			location: '/dashboard/write/topics'
		});
	});

	it('/dashboard/pipelines redirects to /dashboard/workflows', async () => {
		const { load } = await import('./pipelines/+page.server.js');

		await expect(load({} as never)).rejects.toMatchObject({
			status: 301,
			location: '/dashboard/workflows'
		});
	});

	it('/dashboard/pipelines/[id] redirects to /dashboard/workflows/[id] with ID preserved', async () => {
		const { load } = await import('./pipelines/[id]/+page.server.js');

		await expect(load({ params: { id: 'pipe-123' } } as never)).rejects.toMatchObject({
			status: 301,
			location: '/dashboard/workflows/pipe-123'
		});
	});
});
