/**
 * @behavior Migration 013 adds tenant-level configuration columns to
 * the organizations table, enabling per-tenant customization of vocabulary,
 * styles, destinations, UI theme, modules, and tenant type.
 * @business_rule Each organization can customize its configuration independently.
 * Tenant type is constrained to a known set of values.
 * Only org owners and admins can update organization settings.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';

const MIGRATION_PATH =
  '/Users/edkennedy/Code/editengage/supabase/migrations/013_tenant_level_config.sql';

describe('Migration 013: Tenant-level configuration', () => {
  it('migration file exists', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe('column definitions', () => {
    const expectedColumns: Array<{
      name: string;
      type: string;
      default: string;
    }> = [
      {
        name: 'vocabulary_labels',
        type: 'jsonb',
        default: "'{}'::jsonb",
      },
      {
        name: 'default_writing_style_preset',
        type: 'text',
        default: '',
      },
      {
        name: 'default_destination_types',
        type: 'text[]',
        default: "ARRAY['ghost']::text[]",
      },
      {
        name: 'ui_theme',
        type: 'jsonb',
        default: "'{}'::jsonb",
      },
      {
        name: 'enabled_modules',
        type: 'text[]',
        default: "ARRAY['research','writing','publish']::text[]",
      },
      {
        name: 'tenant_type',
        type: 'text',
        default: "'content'",
      },
    ];

    let sql: string;

    it('migration SQL is readable', () => {
      sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
      expect(sql.length).toBeGreaterThan(0);
    });

    it.each(expectedColumns)(
      'defines $name column as $type',
      ({ name, type }) => {
        sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
        const normalizedSql = sql.toLowerCase();
        expect(normalizedSql).toContain(`add column ${name}`);
        expect(normalizedSql).toContain(type.toLowerCase());
      }
    );

    it.each(
      expectedColumns.filter((col) => col.default !== '')
    )(
      '$name has correct default ($default)',
      ({ name, default: defaultVal }) => {
        sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
        // Find the ALTER TABLE statement for this column and check its default
        const pattern = new RegExp(
          `add column ${name}[^;]*default\\s+${escapeRegex(defaultVal)}`,
          'i'
        );
        expect(sql).toMatch(pattern);
      }
    );
  });

  describe('CHECK constraint on tenant_type', () => {
    it('constrains tenant_type to content, research, enterprise', () => {
      const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('check');
      expect(normalizedSql).toContain("'content'");
      expect(normalizedSql).toContain("'research'");
      expect(normalizedSql).toContain("'enterprise'");
    });
  });

  describe('RLS UPDATE policy', () => {
    it('creates an UPDATE policy on organizations', () => {
      const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('create policy');
      expect(normalizedSql).toContain('for update');
      expect(normalizedSql).toContain('on organizations');
    });

    it('restricts updates to org owners and admins via organization_members', () => {
      const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('organization_members');
      expect(normalizedSql).toContain('auth.uid()');
      expect(normalizedSql).toContain("'owner'");
      expect(normalizedSql).toContain("'admin'");
    });
  });
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
