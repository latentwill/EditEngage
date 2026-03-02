/**
 * @behavior The initial database migration defines all required tables,
 * enums, functions, RLS policies, and real-time subscriptions for EditEngage v2
 * @business_rule The schema is the single source of truth for the data model.
 * All 14 tables, 9 enums, helper functions, RLS, and real-time must be present.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const MIGRATION_PATH = resolve(
  import.meta.dirname ?? __dirname,
  '../../../supabase/migrations/001_initial_schema.sql'
);

const MIGRATION_PATH_002 = resolve(
  import.meta.dirname ?? __dirname,
  '../../../supabase/migrations/002_api_keys.sql'
);

describe('001_initial_schema migration', () => {
  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe('SQL content is valid', () => {
    let sql: string;

    beforeAll(() => {
      sql = readFileSync(MIGRATION_PATH, 'utf-8');
    });

    it('is non-empty SQL', () => {
      expect(sql.length).toBeGreaterThan(0);
      // Basic SQL structure checks
      expect(sql).toContain('create');
      expect(sql).toContain('table');
    });

    describe('defines all 14 tables', () => {
      const tables = [
        'organizations',
        'organization_members',
        'projects',
        'destinations',
        'writing_styles',
        'pipelines',
        'pipeline_runs',
        'content',
        'topic_queue',
        'variety_memory',
        'templates',
        'generated_pages',
        'events',
        'notifications',
      ] as const;

      it.each(tables)('defines table: %s', (table) => {
        const pattern = new RegExp(
          `create\\s+table\\s+${table}\\s*\\(`,
          'i'
        );
        expect(sql).toMatch(pattern);
      });
    });

    describe('defines all 9 enum types', () => {
      const enums = [
        'org_member_role',
        'destination_type',
        'pipeline_review_mode',
        'pipeline_run_status',
        'content_type',
        'content_status',
        'topic_status',
        'template_data_source_type',
        'generated_page_status',
      ] as const;

      it.each(enums)('defines enum: %s', (enumType) => {
        const pattern = new RegExp(
          `create\\s+type\\s+${enumType}\\s+as\\s+enum`,
          'i'
        );
        expect(sql).toMatch(pattern);
      });
    });

    describe('defines required helper functions', () => {
      it('defines handle_new_user() function', () => {
        const pattern = /create\s+or\s+replace\s+function\s+handle_new_user\s*\(\s*\)/i;
        expect(sql).toMatch(pattern);
      });

      it('defines get_user_org_ids() function', () => {
        const pattern = /create\s+or\s+replace\s+function\s+get_user_org_ids\s*\(\s*\)/i;
        expect(sql).toMatch(pattern);
      });
    });

    describe('enables RLS on all tables', () => {
      const tables = [
        'organizations',
        'organization_members',
        'projects',
        'destinations',
        'writing_styles',
        'pipelines',
        'pipeline_runs',
        'content',
        'topic_queue',
        'variety_memory',
        'templates',
        'generated_pages',
        'events',
        'notifications',
      ] as const;

      it.each(tables)('enables RLS on: %s', (table) => {
        const pattern = new RegExp(
          `alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`,
          'i'
        );
        expect(sql).toMatch(pattern);
      });
    });

    describe('enables real-time for required tables', () => {
      const realtimeTables = [
        'events',
        'pipeline_runs',
        'content',
        'notifications',
      ] as const;

      it.each(realtimeTables)(
        'enables real-time for: %s',
        (table) => {
          const pattern = new RegExp(
            `alter\\s+publication\\s+supabase_realtime\\s+add\\s+table\\s+${table}`,
            'i'
          );
          expect(sql).toMatch(pattern);
        }
      );
    });
  });
});

describe('002_api_keys migration', () => {
  it('migration file exists', () => {
    expect(existsSync(MIGRATION_PATH_002)).toBe(true);
  });

  describe('SQL content is valid', () => {
    let sql: string;

    beforeAll(() => {
      sql = readFileSync(MIGRATION_PATH_002, 'utf-8');
    });

    it('is non-empty SQL', () => {
      expect(sql.length).toBeGreaterThan(0);
    });

    it('defines enum type api_provider', () => {
      const pattern = /create\s+type\s+api_provider\s+as\s+enum/i;
      expect(sql).toMatch(pattern);
    });

    it('defines table api_keys', () => {
      const pattern = /create\s+table\s+api_keys\s*\(/i;
      expect(sql).toMatch(pattern);
    });

    it('has unique constraint on (project_id, provider)', () => {
      const lower = sql.toLowerCase();
      expect(lower).toContain('unique');
      expect(lower).toContain('project_id');
      expect(lower).toContain('provider');
    });

    it('enables RLS on api_keys', () => {
      const pattern = /alter\s+table\s+api_keys\s+enable\s+row\s+level\s+security/i;
      expect(sql).toMatch(pattern);
    });

    describe('has RLS policies for api_keys', () => {
      it('has select policy', () => {
        expect(sql.toLowerCase()).toContain('on api_keys for select');
      });

      it('has insert policy', () => {
        expect(sql.toLowerCase()).toContain('on api_keys for insert');
      });

      it('has update policy', () => {
        expect(sql.toLowerCase()).toContain('on api_keys for update');
      });

      it('has delete policy', () => {
        expect(sql.toLowerCase()).toContain('on api_keys for delete');
      });
    });
  });
});

