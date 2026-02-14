import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface TopicRow {
  title: string;
  keywords: string[];
  notes: string | null;
}

function parseCsv(text: string): { rows: TopicRow[]; errors: string[] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must have a header row and at least one data row'] };
  }

  const rows: TopicRow[] = [];
  const errors: string[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
    const title = parts[0];

    if (!title) {
      errors.push(`Row ${i + 1}: missing title`);
      continue;
    }

    const keywords = parts[1]
      ? parts[1].split(',').map((k) => k.trim()).filter(Boolean)
      : [];
    const notes = parts[2] || null;

    rows.push({ title, keywords, notes });
  }

  return { rows, errors };
}

function parseJson(text: string): { rows: TopicRow[]; errors: string[] } {
  const errors: string[] = [];

  let parsed: unknown[];
  try {
    parsed = JSON.parse(text);
  } catch {
    return { rows: [], errors: ['Invalid JSON format'] };
  }

  if (!Array.isArray(parsed)) {
    return { rows: [], errors: ['JSON must be an array of topics'] };
  }

  const rows: TopicRow[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as Record<string, unknown>;
    if (!item.title || typeof item.title !== 'string') {
      errors.push(`Item ${i + 1}: missing or invalid title`);
      continue;
    }

    rows.push({
      title: item.title,
      keywords: Array.isArray(item.keywords)
        ? (item.keywords as string[])
        : [],
      notes: typeof item.notes === 'string' ? item.notes : null
    });
  }

  return { rows, errors };
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const projectId = formData.get('project_id') as string | null;

  if (!file) {
    return json({ error: 'file is required' }, { status: 400 });
  }

  if (!projectId) {
    return json({ error: 'project_id is required' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return json({ error: 'File size must not exceed 5MB' }, { status: 400 });
  }

  const text = await file.text();
  const isJson = file.name.endsWith('.json') || file.type === 'application/json';

  const { rows, errors } = isJson ? parseJson(text) : parseCsv(text);

  if (rows.length === 0) {
    return json({
      data: { imported: 0, skipped: errors.length, errors }
    }, { status: 200 });
  }

  const insertRows = rows.map((row) => ({
    project_id: projectId,
    title: row.title,
    keywords: row.keywords,
    notes: row.notes
  }));

  const { data, error } = await supabase
    .from('topic_queue')
    .insert(insertRows)
    .select();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({
    data: {
      imported: data?.length ?? 0,
      skipped: errors.length,
      errors
    }
  }, { status: 200 });
};
