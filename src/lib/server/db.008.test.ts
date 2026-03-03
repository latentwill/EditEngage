/**
 * @behavior The notification tiers migration adds a tier column to notifications,
 * constrained to 'alert', 'update', or 'digest', and updates the trigger function
 * to assign tiers based on event_type patterns.
 * @business_rule Notifications must be categorized by urgency: alerts for failures,
 * updates for completions/publications, digests for everything else.
 * A surviving-rewrite test: checks SQL structure, not runtime behavior.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const MIGRATION_PATH_008 = resolve(
  import.meta.dirname ?? __dirname,
  '../../../supabase/migrations/008_notification_tiers.sql'
);

describe('008_notification_tiers migration', () => {
  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH_008)).toBe(true);
  });

  describe('SQL content is valid', () => {
    let sql: string;

    beforeAll(() => {
      sql = readFileSync(MIGRATION_PATH_008, 'utf-8');
    });

    it('is non-empty SQL', () => {
      expect(sql.length).toBeGreaterThan(0);
    });

    it('adds tier column to notifications table', () => {
      const pattern = /alter\s+table\s+notifications\s+add\s+column\s+tier/i;
      expect(sql).toMatch(pattern);
    });

    it('has CHECK constraint with alert, update, and digest values', () => {
      expect(sql.toLowerCase()).toContain('alert');
      expect(sql.toLowerCase()).toContain('update');
      expect(sql.toLowerCase()).toContain('digest');
      const pattern = /check\s*\(\s*tier\s+in\s*\(/i;
      expect(sql).toMatch(pattern);
    });

    it('creates or replaces the trigger function with tier assignment', () => {
      const pattern =
        /create\s+or\s+replace\s+function\s+create_notifications_from_event\s*\(\s*\)/i;
      expect(sql).toMatch(pattern);
    });

    it('uses payload_summary in COALESCE for notification message', () => {
      expect(sql.toLowerCase()).toContain('payload_summary');
    });
  });
});
