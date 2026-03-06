import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createServerSupabaseClient } from '$lib/server/supabase.js';

export const DELETE: RequestHandler = async ({ params, cookies }) => {
	const supabase = createServerSupabaseClient(cookies);
	const { data: { user }, error: authError } = await supabase.auth.getUser();

	if (authError || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { error } = await supabase
		.from('writing_styles')
		.delete()
		.eq('id', params.id);

	if (error) {
		console.error('[writing-styles DELETE] DB error:', error);
		return json({ error: 'An internal error occurred' }, { status: 500 });
	}

	return json({ success: true }, { status: 200 });
};
