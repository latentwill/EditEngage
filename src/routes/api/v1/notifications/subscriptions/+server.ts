import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { TablesInsert, TablesUpdate } from '$lib/types/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async ({ cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('notification_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ subscriptions: data }, { status: 200 });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { project_id, subscribed_modules, subscribed_event_types } = body;

  if (!project_id || typeof project_id !== 'string' || !UUID_REGEX.test(project_id)) {
    return json({ error: 'Valid project_id (UUID) is required' }, { status: 400 });
  }

  if (!Array.isArray(subscribed_modules)) {
    return json({ error: 'subscribed_modules must be an array' }, { status: 400 });
  }

  const insertPayload: TablesInsert<'notification_subscriptions'> = {
    user_id: user.id,
    project_id,
    subscribed_modules
  };

  if (Array.isArray(subscribed_event_types)) {
    insertPayload.subscribed_event_types = subscribed_event_types;
  }

  const { data, error } = await supabase
    .from('notification_subscriptions')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ subscription: data }, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, subscribed_modules, subscribed_event_types, is_active } = body;

  if (!id || typeof id !== 'string') {
    return json({ error: 'Subscription id is required' }, { status: 400 });
  }

  const updatePayload: TablesUpdate<'notification_subscriptions'> = {};

  if (subscribed_modules !== undefined) {
    if (!Array.isArray(subscribed_modules)) {
      return json({ error: 'subscribed_modules must be an array' }, { status: 400 });
    }
    updatePayload.subscribed_modules = subscribed_modules;
  }

  if (subscribed_event_types !== undefined) {
    if (!Array.isArray(subscribed_event_types)) {
      return json({ error: 'subscribed_event_types must be an array' }, { status: 400 });
    }
    updatePayload.subscribed_event_types = subscribed_event_types;
  }

  if (is_active !== undefined) {
    if (typeof is_active !== 'boolean') {
      return json({ error: 'is_active must be a boolean' }, { status: 400 });
    }
    updatePayload.is_active = is_active;
  }

  if (Object.keys(updatePayload).length === 0) {
    return json({ error: 'At least one update field is required' }, { status: 400 });
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('notification_subscriptions')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ subscription: data }, { status: 200 });
};
