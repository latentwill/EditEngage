/**
 * @behavior Migration 014 creates the pipeline_run_logs table for tracking
 * individual step execution within pipeline runs, including timing and output.
 * @business_rule Each log entry belongs to a pipeline run and tracks a single
 * step's execution. Users can only read logs for their organization's pipeline runs.
 * Service role can insert/update logs for background job processing.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';

const MIGRATION_PATH =
  'supabase/migrations/014_create_pipeline_run_logs.sql';

describe('Migration 014: Pipeline run logs', () => {
  it('migration file exists', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe('table definition', () => {
    let sql: string;

    it('creates pipeline_run_logs table', () => {
      sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
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
        sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
        const normalizedSql = sql.toLowerCase();
        expect(normalizedSql).toContain(name);
        expect(normalizedSql).toContain(type.toLowerCase());
      }
    );
  });

  describe('foreign key constraint', () => {
    it('references pipeline_runs(id) with cascade delete', () => {
      const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('references pipeline_runs(id)');
      expect(normalizedSql).toContain('on delete cascade');
    });
  });

  describe('index', () => {
    it('creates composite index on pipeline_run_id and step_index', () => {
      const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('create index');
      expect(normalizedSql).toContain('pipeline_run_id');
      expect(normalizedSql).toContain('step_index');
    });
  });

  describe('row level security', () => {
    it('enables RLS on pipeline_run_logs', () => {
      const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('enable row level security');
    });

    it('creates a select policy for users to read logs for their org pipeline runs', () => {
      const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('create policy');
      expect(normalizedSql).toContain('for select');
      expect(normalizedSql).toContain('pipeline_runs');
      expect(normalizedSql).toContain('pipelines');
      expect(normalizedSql).toContain('projects');
      expect(normalizedSql).toContain('get_user_org_ids()');
    });

    it('creates a service role policy for insert/update', () => {
      const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
      const normalizedSql = sql.toLowerCase();
      expect(normalizedSql).toContain('for all');
      expect(normalizedSql).toContain('with check (true)');
    });
  });
});
