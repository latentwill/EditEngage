import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = url.searchParams.get('project_id');

  let query = supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data: templates, error } = await query;

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data: templates }, { status: 200 });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, project_id, slug_pattern, layout, sections, seo_config, data_source_type, data_source_config } = body;

  if (!name || !slug_pattern) {
    return json({ error: 'name and slug_pattern are required' }, { status: 400 });
  }

  const { data: template, error } = await supabase
    .from('templates')
    .insert({
      name,
      project_id: project_id ?? null,
      slug_pattern,
      layout: layout ?? null,
      sections: sections ?? [],
      seo_config: seo_config ?? null,
      data_source_type: data_source_type ?? null,
      data_source_config: data_source_config ?? null
    })
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data: template }, { status: 201 });
};
