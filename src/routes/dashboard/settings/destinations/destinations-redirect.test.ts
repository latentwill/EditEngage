/**
 * @behavior Visiting /dashboard/settings/destinations redirects to /dashboard/publish/destinations
 * @business_rule The settings destinations page is a redirect stub. Users with old bookmarks
 *   are seamlessly redirected to the canonical publish destinations page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedirect = vi.fn();
vi.mock('@sveltejs/kit', () => ({
	redirect: (...args: unknown[]) => {
		mockRedirect(...args);
		throw { status: 301, location: args[1] };
	}
}));

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost:54321',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));
vi.mock('$env/static/private', () => ({
	SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

describe('Destinations Settings Redirect', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects /dashboard/settings/destinations to /dashboard/publish/destinations with 301', async () => {
		const { load } = await import('./+page.server.js');

		await expect(load({} as never)).rejects.toMatchObject({
			status: 301,
			location: '/dashboard/publish/destinations'
		});
	});
});
