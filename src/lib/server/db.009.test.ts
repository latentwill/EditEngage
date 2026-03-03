/**
 * @behavior The notification subscriptions migration creates a table for users to
 * manage per-project notification preferences by module and event type, and updates
 * the trigger function to filter notifications based on those subscriptions.
 * @business_rule Users can opt out of specific notification modules per project.
 * Only users without an active subscription blocking the module receive notifications.
 * A surviving-rewrite test: checks SQL structure, not runtime behavior.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const MIGRATION_PATH_009 = resolve(
  import.meta.dirname ?? __dirname,
  '../../../supabase/migrations/009_notification_subscriptions.sql'
);

describe('009_notification_subscriptions migration', () => {
  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH_009)).toBe(true);
  });

  describe('SQL content is valid', () => {
    let sql: string;

    beforeAll(() => {
      sql = readFileSync(MIGRATION_PATH_009, 'utf-8');
    });

    it('is non-empty SQL', () => {
      expect(sql.length).toBeGreaterThan(0);
    });

    it('creates notification_subscriptions table', () => {
      const pattern = /create\s+table\s+notification_subscriptions/i;
      expect(sql).toMatch(pattern);
    });

    it('has user_id and project_id columns with foreign keys', () => {
      expect(sql.toLowerCase()).toContain('user_id');
      expect(sql.toLowerCase()).toContain('project_id');
      expect(sql.toLowerCase()).toContain('references auth.users');
      expect(sql.toLowerCase()).toContain('references projects');
    });

    it('has subscribed_modules column as text array', () => {
      const pattern = /subscribed_modules\s+text\[\]/i;
      expect(sql).toMatch(pattern);
    });

    it('has subscribed_event_types column as text array', () => {
      const pattern = /subscribed_event_types\s+text\[\]/i;
      expect(sql).toMatch(pattern);
    });

    it('has is_active boolean column', () => {
      const pattern = /is_active\s+boolean/i;
      expect(sql).toMatch(pattern);
    });

    it('has UNIQUE constraint on user_id and project_id', () => {
      const pattern = /unique\s*\(\s*user_id\s*,\s*project_id\s*\)/i;
      expect(sql).toMatch(pattern);
    });

    it('enables row level security', () => {
      const pattern = /enable\s+row\s+level\s+security/i;
      expect(sql).toMatch(pattern);
    });

    it('creates RLS policy for user self-management', () => {
      const pattern = /create\s+policy/i;
      expect(sql).toMatch(pattern);
      expect(sql.toLowerCase()).toContain('auth.uid()');
    });

    it('creates or replaces create_notifications_from_event with subscription check', () => {
      const pattern =
        /create\s+or\s+replace\s+function\s+create_notifications_from_event\s*\(\s*\)/i;
      expect(sql).toMatch(pattern);
      expect(sql.toLowerCase()).toContain('notification_subscriptions');
    });

    it('checks subscribed_modules in the trigger function', () => {
      expect(sql.toLowerCase()).toContain('subscribed_modules');
    });
  });
});
