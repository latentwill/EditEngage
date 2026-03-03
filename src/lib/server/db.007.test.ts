/**
 * @behavior The notification event schema migration extends the events table with
 * agent_id, module, payload_summary, and artifact_link columns so that events carry
 * richer context for the notification feed.
 * @business_rule Events must track which module and agent produced them, and carry
 * a human-readable summary and optional deep-link to the resulting artifact.
 * A surviving-rewrite test: checks SQL structure, not runtime behavior.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const MIGRATION_PATH_007 = resolve(
  import.meta.dirname ?? __dirname,
  '../../../supabase/migrations/007_notification_event_schema.sql'
);

describe('007_notification_event_schema migration', () => {
  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH_007)).toBe(true);
  });

  describe('SQL content is valid', () => {
    let sql: string;

    beforeAll(() => {
      sql = readFileSync(MIGRATION_PATH_007, 'utf-8');
    });

    it('is non-empty SQL', () => {
      expect(sql.length).toBeGreaterThan(0);
    });

    it('adds agent_id column to events', () => {
      const pattern = /alter\s+table\s+events\s+add\s+column\s+agent_id\s+uuid/i;
      expect(sql).toMatch(pattern);
    });

    it('adds module column to events', () => {
      const pattern = /alter\s+table\s+events\s+add\s+column\s+module\s+text/i;
      expect(sql).toMatch(pattern);
    });

    it('adds payload_summary column to events', () => {
      const pattern = /alter\s+table\s+events\s+add\s+column\s+payload_summary\s+text/i;
      expect(sql).toMatch(pattern);
    });

    it('adds artifact_link column to events', () => {
      const pattern = /alter\s+table\s+events\s+add\s+column\s+artifact_link\s+text/i;
      expect(sql).toMatch(pattern);
    });

    it('has CHECK constraint on module with all valid values', () => {
      const pattern = /check\s*\(\s*module\s+in\s*\(\s*'research'\s*,\s*'writing'\s*,\s*'publish'\s*,\s*'system'\s*\)\s*\)/i;
      expect(sql).toMatch(pattern);
    });

    it('creates partial index on module', () => {
      const pattern = /create\s+index\s+idx_events_module\s+on\s+events\s*\(\s*module\s*\)\s+where\s+module\s+is\s+not\s+null/i;
      expect(sql).toMatch(pattern);
    });

    it('creates partial index on agent_id', () => {
      const pattern = /create\s+index\s+idx_events_agent_id\s+on\s+events\s*\(\s*agent_id\s*\)\s+where\s+agent_id\s+is\s+not\s+null/i;
      expect(sql).toMatch(pattern);
    });
  });
});
