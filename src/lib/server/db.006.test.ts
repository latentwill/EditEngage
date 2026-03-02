/**
 * @behavior The notifications trigger migration creates a trigger function that
 * automatically inserts a notification for every org member when a new event is created.
 * @business_rule Every organization member must be notified of project events they belong to.
 * A surviving-rewrite test: checks SQL structure, not runtime behavior.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const MIGRATION_PATH_006 = resolve(
  import.meta.dirname ?? __dirname,
  '../../../supabase/migrations/006_notifications_trigger.sql'
);

describe('006_notifications_trigger migration', () => {
  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH_006)).toBe(true);
  });

  describe('SQL content is valid', () => {
    let sql: string;

    beforeAll(() => {
      sql = readFileSync(MIGRATION_PATH_006, 'utf-8');
    });

    it('is non-empty SQL', () => {
      expect(sql.length).toBeGreaterThan(0);
    });

    it('defines trigger function create_notifications_from_event', () => {
      const pattern =
        /create\s+or\s+replace\s+function\s+create_notifications_from_event\s*\(\s*\)/i;
      expect(sql).toMatch(pattern);
    });

    it('defines trigger trg_events_create_notifications on events table', () => {
      const pattern =
        /create\s+trigger\s+trg_events_create_notifications[\s\S]*?on\s+events/i;
      expect(sql).toMatch(pattern);
    });

    it('references organization_members table for user lookup', () => {
      expect(sql.toLowerCase()).toContain('organization_members');
    });

    it('inserts into notifications table using fully qualified reference', () => {
      expect(sql.toLowerCase()).toContain('insert into public.notifications');
    });
  });
});
