/**
 * @behavior Migration 014 creates the pipeline_run_logs table for tracking
 * individual step execution within pipeline runs, including timing and output.
 * Migration 015 fixes an overly permissive RLS policy (MEDIUM-003) by replacing
 * a "for all" policy with scoped insert/update policies restricted to service_role.
 * @business_rule Each log entry belongs to a pipeline run and tracks a single
 * step's execution. Users can only read logs for their organization's pipeline runs.
 * Service role (only) can insert/update logs for background job processing.
 * No role should be able to delete logs.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';

const MIGRATION_014_PATH =
  'supabase/migrations/014_create_pipeline_run_logs.sql';
const MIGRATION_015_PATH =
  'supabase/migrations/015_fix_pipeline_run_logs_rls.sql';

describe('Migration 014: Pipeline run logs', () => {
  it('migration file exists', () => {
    expect(fs.existsSync(MIGRATION_014_PATH)).toBe(true);
  });

  describe('table definition', () => {
    let sql: string;

    it('creates pipeline_run_logs table', () => {
      sql = fs.readFileSync(MIGRATION_014_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('create table pipeline_run_logs');
    });

    const expectedColumns = [
      { name: 'id', type: 'uuid' },
      { name: 'pipeline_run_id', type: 'uuid' },
      { name: 'step_index', type: 'integer' },
      { name: 'agent_name', type: 'text' },
      { name: 'status', type: 'text' },
      { name: 'log_output', type: 'text' },
      { name: 'started_at', type: 'timestamptz' },
      { name: 'completed_at', type: 'timestamptz' },
      { name: 'duration_ms', type: 'integer' },
      { name: 'created_at', type: 'timestamptz' },
    ];

    it.each(expectedColumns)(
      'defines $name column as $type',
      ({ name, type }) => {
        sql = fs.readFileSync(MIGRATION_014_PATH, 'utf-8');
        const normalizedSql = sql.toLowerCase();
        expect(normalizedSql).toContain(name);
        expect(normalizedSql).toContain(type.toLowerCase());
      }
    );
  });

  describe('foreign key constraint', () => {
    it('references pipeline_runs(id) with cascade delete', () => {
      const sql = fs.readFileSync(MIGRATION_014_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('references pipeline_runs(id)');
      expect(normalizedSql).toContain('on delete cascade');
    });
  });

  describe('index', () => {
    it('creates composite index on pipeline_run_id and step_index', () => {
      const sql = fs.readFileSync(MIGRATION_014_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('create index');
      expect(normalizedSql).toContain('pipeline_run_id');
      expect(normalizedSql).toContain('step_index');
    });
  });

  describe('row level security', () => {
    it('enables RLS on pipeline_run_logs', () => {
      const sql = fs.readFileSync(MIGRATION_014_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('enable row level security');
    });

    it('creates a select policy for users to read logs for their org pipeline runs', () => {
      const sql = fs.readFileSync(MIGRATION_014_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('create policy');
      expect(normalizedSql).toContain('for select');
      expect(normalizedSql).toContain('pipeline_runs');
      expect(normalizedSql).toContain('pipelines');
      expect(normalizedSql).toContain('projects');
      expect(normalizedSql).toContain('get_user_org_ids()');
    });
  });
});

describe('Migration 015: Fix pipeline_run_logs RLS (MEDIUM-003)', () => {
  it('migration file exists', () => {
    expect(fs.existsSync(MIGRATION_015_PATH)).toBe(true);
  });

  describe('drops the overly permissive policy', () => {
    it('drops the old "for all" policy by name', () => {
      const sql = fs.readFileSync(MIGRATION_015_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('drop policy');
      expect(normalizedSql).toContain('pipeline_run_logs');
    });
  });

  describe('creates scoped service_role policies', () => {
    let sql: string;
    let normalizedSql: string;

    function loadSql(): void {
      sql = fs.readFileSync(MIGRATION_015_PATH, 'utf-8');
      normalizedSql = sql.toLowerCase();
    }

    it('creates an insert policy restricted to service_role', () => {
      loadSql();
      expect(normalizedSql).toContain('for insert');
      expect(normalizedSql).toContain('to service_role');
    });

    it('creates an update policy restricted to service_role', () => {
      loadSql();
      expect(normalizedSql).toContain('for update');
      expect(normalizedSql).toContain('to service_role');
    });

    it('does NOT use "for all" in the new policies', () => {
      loadSql();
      // The new migration should not introduce any "for all" policies
      const policyBlocks = normalizedSql
        .split('create policy')
        .slice(1); // skip text before first policy
      for (const block of policyBlocks) {
        expect(block).not.toContain('for all');
      }
    });

    it('does NOT grant delete access', () => {
      loadSql();
      expect(normalizedSql).not.toContain('for delete');
    });
  });

  describe('combined effect of 014 + 015', () => {
    it('the select policy from 014 remains untouched (not dropped in 015)', () => {
      const sql015 = fs.readFileSync(MIGRATION_015_PATH, 'utf-8').toLowerCase();
      // 015 only drops the "Service role can insert/update logs" policy
      // It must NOT drop the select policy
      expect(sql015).not.toContain(
        'users can read logs'
      );
    });

    it('after both migrations, no "for all" policy should exist', () => {
      // 014 has "for all" but 015 drops it and replaces with scoped policies
      const sql015 = fs.readFileSync(MIGRATION_015_PATH, 'utf-8').toLowerCase();
      expect(sql015).toContain('drop policy');
      // And does not re-introduce "for all"
      const newPolicies = sql015.split('create policy').slice(1);
      for (const policy of newPolicies) {
        expect(policy).not.toContain('for all');
      }
    });
  });
});
