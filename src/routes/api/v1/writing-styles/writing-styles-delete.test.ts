/**
 * @behavior DELETE /api/v1/writing-styles/:id removes a writing style
 * @business_rule Only authenticated users can delete styles; RLS enforces project scoping
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/private', () => ({
	SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost:54321',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

function createChainMock(terminalValue: { data: unknown; error: unknown }) {
	const chain: Record<string, ReturnType<typeof vi.fn>> = {};
	chain.select = vi.fn().mockReturnValue(chain);
	chain.insert = vi.fn().mockReturnValue(chain);
	chain.update = vi.fn().mockReturnValue(chain);
	chain.delete = vi.fn().mockReturnValue(chain);
	chain.eq = vi.fn().mockReturnValue(chain);
	chain.in = vi.fn().mockReturnValue(chain);
	chain.single = vi.fn().mockResolvedValue(terminalValue);
	chain.order = vi.fn().mockReturnValue(chain);
	chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
	return chain;
}

let mockChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };

const mockSupabase = {
	auth: {
		getUser: vi.fn(() =>
			Promise.resolve({
				data: { user: mockAuthUser },
				error: mockAuthUser ? null : { message: 'Not authenticated' }
			})
		)
	},
	from: vi.fn(() => mockChain)
};

vi.mock('$lib/server/supabase', () => ({
	createServerSupabaseClient: vi.fn(() => mockSupabase)
}));

function makeDeleteRequest(): Request {
	return new Request('http://localhost/api/v1/writing-styles/style-1', {
		method: 'DELETE'
	});
}

describe('DELETE /api/v1/writing-styles/:id', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAuthUser = { id: 'user-1' };
		mockChain = createChainMock({ data: null, error: null });
	});

	it('deletes a writing style and returns success', async () => {
		const { DELETE } = await import('./[id]/+server.js');

		const request = makeDeleteRequest();
		const response = await DELETE({
			request,
			params: { id: 'style-1' },
			cookies: {}
		} as never);
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.success).toBe(true);
		expect(mockSupabase.from).toHaveBeenCalledWith('writing_styles');
		expect(mockChain.delete).toHaveBeenCalled();
	});

	it('returns 401 when user is not authenticated', async () => {
		mockAuthUser = null;

		const { DELETE } = await import('./[id]/+server.js');

		const request = makeDeleteRequest();
		const response = await DELETE({
			request,
			params: { id: 'style-1' },
			cookies: {}
		} as never);

		expect(response.status).toBe(401);
	});

	it('returns 500 when database delete fails', async () => {
		mockChain = createChainMock({ data: null, error: { message: 'DB error' } });

		const { DELETE } = await import('./[id]/+server.js');

		const request = makeDeleteRequest();
		const response = await DELETE({
			request,
			params: { id: 'style-1' },
			cookies: {}
		} as never);

		expect(response.status).toBe(500);
	});
});
