/**
 * @behavior Migration 010 adds lifecycle states to research_query_status enum
 * @business_rule Research queries follow Queued -> Running -> Complete -> Consumed lifecycle
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Migration 010: Research Lifecycle States', () => {
  it('should add queued, complete, and consumed values to research_query_status enum', () => {
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/010_research_lifecycle_states.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain("ALTER TYPE research_query_status ADD VALUE IF NOT EXISTS 'queued'");
    expect(sql).toContain("ALTER TYPE research_query_status ADD VALUE IF NOT EXISTS 'complete'");
    expect(sql).toContain("ALTER TYPE research_query_status ADD VALUE IF NOT EXISTS 'consumed'");
  });
});
