/**
 * @behavior Settings sub-nav contains only links to real (non-redirect) settings pages
 * @business_rule After cleanup of orphaned integrations and dead destinations pages,
 *   the sub-nav must only show General and Connections — no redirect stubs.
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost:54321',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$lib/supabase', () => ({
	createSupabaseClient: vi.fn(() => ({}))
}));

describe('Settings Sub-Nav — Valid Links Only', () => {
	it('contains General and Connections links', async () => {
		const SettingsLayout = (await import('./+layout.svelte')).default;
		render(SettingsLayout, {
			props: { data: { projectId: 'proj-1' } }
		});

		const nav = screen.getByTestId('settings-sub-nav');
		expect(nav.querySelector('a[href="/dashboard/settings"]')).not.toBeNull();
		expect(nav.querySelector('a[href="/dashboard/settings/connections"]')).not.toBeNull();
	});

	it('does not contain links to redirect-only routes (integrations, destinations, writing-styles)', async () => {
		const SettingsLayout = (await import('./+layout.svelte')).default;
		render(SettingsLayout, {
			props: { data: { projectId: 'proj-1' } }
		});

		const nav = screen.getByTestId('settings-sub-nav');
		expect(nav.querySelector('a[href="/dashboard/settings/integrations"]')).toBeNull();
		expect(nav.querySelector('a[href="/dashboard/settings/destinations"]')).toBeNull();
		expect(nav.querySelector('a[href="/dashboard/settings/writing-styles"]')).toBeNull();
	});

	it('has exactly 2 nav items', async () => {
		const SettingsLayout = (await import('./+layout.svelte')).default;
		render(SettingsLayout, {
			props: { data: { projectId: 'proj-1' } }
		});

		const nav = screen.getByTestId('settings-sub-nav');
		const links = nav.querySelectorAll('a');
		expect(links.length).toBe(2);
	});
});
