/**
 * @behavior Visiting /dashboard/settings/integrations redirects to /dashboard/settings/connections
 * @business_rule The integrations page is orphaned (duplicate of connections). Users with old
 *   bookmarks should be seamlessly redirected to the canonical connections page.
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
vi.mock('$lib/server/supabase', () => ({
	createServerSupabaseClient: vi.fn(),
	createServiceRoleClient: vi.fn()
}));

describe('Integrations Redirect', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects /dashboard/settings/integrations to /dashboard/settings/connections with 301', async () => {
		const { load } = await import('./+page.server.js');

		await expect(load({} as never)).rejects.toMatchObject({
			status: 301,
			location: '/dashboard/settings/connections'
		});
	});
});
