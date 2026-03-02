import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function parseCsvRow(row: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
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

  if (!projectId) {
    return json({ error: 'project_id is required' }, { status: 400 });
  }

  if (!file) {
    return json({ error: 'file is required' }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return json({ data: { imported: 0, skipped: 0, errors: ['No data rows found'] } }, { status: 200 });
  }

  // Skip header row
  const dataRows = lines.slice(1);
  const toInsert: Array<{ project_id: string; title: string; keywords: string[]; notes: string | null }> = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const fields = parseCsvRow(dataRows[i]);
    const title = fields[0]?.trim();
    const keywordsRaw = fields[1]?.trim() ?? '';
    const notes = fields[2]?.trim() || null;

    if (!title) {
      errors.push(`Row ${i + 2}: missing title`);
      skipped++;
      continue;
    }

    const keywords = keywordsRaw
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    toInsert.push({ project_id: projectId, title, keywords, notes });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('topic_queue').insert(toInsert);

    if (error) {
      console.error('Import insert error:', error);
      return json({ error: 'Failed to insert topics' }, { status: 500 });
    }
  }

  return json({
    data: {
      imported: toInsert.length,
      skipped,
      errors
    }
  }, { status: 200 });
};
