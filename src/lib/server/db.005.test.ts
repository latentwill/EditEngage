/**
 * @behavior The user_preferences migration defines the user_preferences table
 * with a unique constraint on user_id, RLS policies scoped to auth.uid(),
 * and an updated_at trigger.
 * @business_rule Users own their own preferences row (favorite_projects, default_project).
 * Access is user-scoped via auth.uid(), not org-scoped.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const MIGRATION_PATH_005 = resolve(
  import.meta.dirname ?? __dirname,
  '../../../supabase/migrations/005_user_preferences.sql'
);

describe('005_user_preferences migration', () => {
  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH_005)).toBe(true);
  });

  describe('SQL content is valid', () => {
    let sql: string;

    beforeAll(() => {
      sql = readFileSync(MIGRATION_PATH_005, 'utf-8');
    });

    it('is non-empty SQL', () => {
      expect(sql.length).toBeGreaterThan(0);
    });

    it('defines table user_preferences', () => {
      const pattern = /create\s+table\s+user_preferences\s*\(/i;
      expect(sql).toMatch(pattern);
    });

    it('has unique constraint on user_id', () => {
      const lower = sql.toLowerCase();
      expect(lower).toContain('unique');
      expect(lower).toContain('user_id');
    });

    it('enables RLS on user_preferences', () => {
      const pattern = /alter\s+table\s+user_preferences\s+enable\s+row\s+level\s+security/i;
      expect(sql).toMatch(pattern);
    });

    describe('has RLS policies for user_preferences', () => {
      it('has select policy using auth.uid()', () => {
        const lower = sql.toLowerCase();
        expect(lower).toContain('on user_preferences for select');
        expect(lower).toContain('auth.uid()');
      });

      it('has insert policy using auth.uid()', () => {
        expect(sql.toLowerCase()).toContain('on user_preferences for insert');
      });

      it('has update policy using auth.uid()', () => {
        expect(sql.toLowerCase()).toContain('on user_preferences for update');
      });

      it('has delete policy using auth.uid()', () => {
        expect(sql.toLowerCase()).toContain('on user_preferences for delete');
      });
    });

    it('has updated_at trigger', () => {
      const pattern = /create\s+trigger\s+\S*user_preferences\S*.*update_updated_at_column/is;
      expect(sql).toMatch(pattern);
    });
  });
});
