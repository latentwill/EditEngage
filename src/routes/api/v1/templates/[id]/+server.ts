import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { data: template, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) return json({ error: 'Not found' }, { status: 404 });

  return json({ data: template }, { status: 200 });
};

export const PUT: RequestHandler = async ({ params, request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, slug_pattern, layout, sections, seo_config, data_source_type, data_source_config } = body;

  const { data: template, error } = await supabase
    .from('templates')
    .update({
      name,
      slug_pattern,
      layout: layout ?? null,
      sections: sections ?? [],
      seo_config: seo_config ?? null,
      data_source_type: data_source_type ?? null,
      data_source_config: data_source_config ?? null
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data: template }, { status: 200 });
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', params.id);

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ success: true }, { status: 200 });
};
