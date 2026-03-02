/**
 * @behavior The research tables migration defines research_queries and research_briefs
 * tables with proper enums, RLS policies, triggers, and foreign keys.
 * @business_rule Research queries belong to projects (org-scoped). Research briefs
 * belong to queries. Both must enforce row-level security through org membership.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const MIGRATION_PATH_004 = resolve(
  import.meta.dirname ?? __dirname,
  '../../../supabase/migrations/004_research_tables.sql'
);

describe('004_research_tables migration', () => {
  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH_004)).toBe(true);
  });

  describe('SQL content is valid', () => {
    let sql: string;

    beforeAll(() => {
      sql = readFileSync(MIGRATION_PATH_004, 'utf-8');
    });

    it('is non-empty SQL', () => {
      expect(sql.length).toBeGreaterThan(0);
      expect(sql).toContain('create');
      expect(sql).toContain('table');
    });

    describe('defines all 4 enum types', () => {
      const enums = [
        'research_provider',
        'research_provider_role',
        'research_query_status',
        'synthesis_mode',
      ] as const;

      it.each(enums)('defines enum: %s', (enumType) => {
        const pattern = new RegExp(
          `create\\s+type\\s+${enumType}\\s+as\\s+enum`,
          'i'
        );
        expect(sql).toMatch(pattern);
      });
    });

    describe('defines both tables', () => {
      const tables = ['research_queries', 'research_briefs'] as const;

      it.each(tables)('defines table: %s', (table) => {
        const pattern = new RegExp(
          `create\\s+table\\s+${table}\\s*\\(`,
          'i'
        );
        expect(sql).toMatch(pattern);
      });
    });

    describe('enables RLS on both tables', () => {
      const tables = ['research_queries', 'research_briefs'] as const;

      it.each(tables)('enables RLS on: %s', (table) => {
        const pattern = new RegExp(
          `alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`,
          'i'
        );
        expect(sql).toMatch(pattern);
      });
    });

    describe('has RLS policies for research_queries', () => {
      it('has select policy', () => {
        expect(sql.toLowerCase()).toContain('on research_queries for select');
      });

      it('has insert policy', () => {
        expect(sql.toLowerCase()).toContain('on research_queries for insert');
      });

      it('has update policy', () => {
        expect(sql.toLowerCase()).toContain('on research_queries for update');
      });

      it('has delete policy', () => {
        expect(sql.toLowerCase()).toContain('on research_queries for delete');
      });
    });

    describe('has RLS policies for research_briefs', () => {
      it('has select policy', () => {
        expect(sql.toLowerCase()).toContain('on research_briefs for select');
      });

      it('has insert policy', () => {
        expect(sql.toLowerCase()).toContain('on research_briefs for insert');
      });

      it('has update policy', () => {
        expect(sql.toLowerCase()).toContain('on research_briefs for update');
      });

      it('has delete policy', () => {
        expect(sql.toLowerCase()).toContain('on research_briefs for delete');
      });
    });

    it('has updated_at trigger on research_queries', () => {
      const lower = sql.toLowerCase();
      expect(lower).toContain('trigger');
      expect(lower).toContain('research_queries');
      expect(lower).toContain('update_updated_at_column');
    });

    it('has foreign key from research_briefs.query_id to research_queries', () => {
      const lower = sql.toLowerCase();
      expect(lower).toContain('query_id');
      expect(lower).toMatch(/references\s+research_queries\s*\(\s*id\s*\)/i);
    });
  });
});
