import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createServerSupabaseClient } from '$lib/server/supabase.js';
import { getUserProjects } from '$lib/server/project-access.js';

export const DELETE: RequestHandler = async ({ params, cookies }) => {
	const supabase = createServerSupabaseClient(cookies);
	const { data: { user }, error: authError } = await supabase.auth.getUser();

	if (authError || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Fetch the style to verify it exists and get its project_id
	const { data: style } = await supabase
		.from('writing_styles')
		.select('id, project_id')
		.eq('id', params.id)
		.single();

	if (!style) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	// Verify ownership through project membership
	const projects = await getUserProjects(supabase, user.id);
	const projectIds = projects.map((p) => p.id);

	if (!projectIds.includes(style.project_id)) {
		return json({ error: 'Not found' }, { status: 404 });
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
