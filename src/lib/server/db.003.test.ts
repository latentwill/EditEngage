/**
 * @behavior The writing_agents migration defines the writing_agents table,
 * enables RLS with org-scoped select and admin-scoped insert/update/delete,
 * and adds an updated_at trigger.
 * @business_rule Writing agents belong to projects and are managed by org admins.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const MIGRATION_PATH_003 = resolve(
  import.meta.dirname ?? __dirname,
  '../../../supabase/migrations/003_writing_agents.sql'
);

describe('003_writing_agents migration', () => {
  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH_003)).toBe(true);
  });

  describe('SQL content is valid', () => {
    let sql: string;

    beforeAll(() => {
      sql = readFileSync(MIGRATION_PATH_003, 'utf-8');
    });

    it('is non-empty SQL', () => {
      expect(sql.length).toBeGreaterThan(0);
    });

    it('defines table writing_agents', () => {
      const pattern = /create\s+table\s+writing_agents\s*\(/i;
      expect(sql).toMatch(pattern);
    });

    it('enables RLS on writing_agents', () => {
      const pattern = /alter\s+table\s+writing_agents\s+enable\s+row\s+level\s+security/i;
      expect(sql).toMatch(pattern);
    });

    describe('has RLS policies for writing_agents', () => {
      it('has select policy', () => {
        expect(sql.toLowerCase()).toContain('on writing_agents for select');
      });

      it('has insert policy', () => {
        expect(sql.toLowerCase()).toContain('on writing_agents for insert');
      });

      it('has update policy', () => {
        expect(sql.toLowerCase()).toContain('on writing_agents for update');
      });

      it('has delete policy', () => {
        expect(sql.toLowerCase()).toContain('on writing_agents for delete');
      });
    });

    it('has updated_at trigger', () => {
      const pattern = /create\s+trigger\s+\S*writing_agents\S*.*update_updated_at_column/is;
      expect(sql).toMatch(pattern);
    });
  });
});
