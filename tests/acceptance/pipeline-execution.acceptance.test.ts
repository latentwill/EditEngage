/**
 * @behavior Users can create, run, and track pipelines asynchronously
 * @user-story US-005: Pipeline Creation, US-006: Pipeline Execution (Async)
 * @boundary API (/api/v1/pipelines, /api/v1/jobs)
 *
 * These acceptance tests verify the async pipeline execution contract:
 * fire-and-forget with status polling. Tests the full lifecycle from
 * pipeline creation through run completion.
 */
import { describe, it, expect } from 'vitest';

describe('Pipeline Execution (Acceptance)', () => {
  describe('Scenario: Create Pipeline via Wizard (AC-005.1 through AC-005.5)', () => {
    it('should save a complete pipeline configuration', async () => {
      // GIVEN - I have a project with configured destinations and writing styles
      const pipelineConfig = {
        name: 'Extndly SEO Blog Pipeline',
        description: 'Automated SEO article generation for extndly.com',
        project_id: 'project-uuid',
        schedule: null, // manual only for now
        review_mode: 'draft_for_review',
        steps: [
          { agent_type: 'topic_queue', config: { strategy: 'highest_seo_score' }, order: 1 },
          { agent_type: 'variety_engine', config: { similarity_threshold: 0.65, max_mutations: 5 }, order: 2 },
          { agent_type: 'seo_writer', config: { writing_style_id: 'style-uuid', llm_model: 'moonshotai/kimi-k2-thinking', serp_research: true }, order: 3 },
          { agent_type: 'ghost_publisher', config: { destination_id: 'dest-uuid' }, order: 4 },
        ],
      };

      // WHEN - I save the pipeline
      const response = await fetch('/api/v1/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pipelineConfig),
      });

      // THEN - The pipeline is saved with all steps
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data).toMatchObject({
        id: expect.any(String),
        name: 'Extndly SEO Blog Pipeline',
        review_mode: 'draft_for_review',
        is_active: true,
      });
      expect(body.data.steps).toHaveLength(4);
    });
  });

  describe('Scenario: Manual Pipeline Run — Fire-and-Forget (AC-006.1)', () => {
    it('should enqueue a job and return jobId immediately', async () => {
      // GIVEN - I have a saved, active pipeline
      const pipelineId = 'pipeline-uuid';

      // WHEN - I click "Run Now"
      const response = await fetch(`/api/v1/pipelines/${pipelineId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // THEN - I immediately get a jobId (non-blocking)
      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body.data).toHaveProperty('jobId');
      expect(body.data).toHaveProperty('pipelineRunId');
      expect(body.data.status).toBe('queued');
    });
  });

  describe('Scenario: Status Polling (AC-006.3)', () => {
    it('should return current progress for a running job', async () => {
      // GIVEN - A pipeline is running
      const jobId = 'running-job-id';

      // WHEN - I poll for status
      const response = await fetch(`/api/v1/jobs/${jobId}/status`, {
        headers: { 'Content-Type': 'application/json' },
      });

      // THEN - I see progress information
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toMatchObject({
        status: expect.stringMatching(/^(queued|running|completed|failed)$/),
        currentStep: expect.any(Number),
        totalSteps: expect.any(Number),
      });
    });
  });

  describe('Scenario: Pipeline Completion (AC-006.5)', () => {
    it('should return completed status with result on success', async () => {
      // GIVEN - A pipeline run has finished successfully
      const jobId = 'completed-job-id';

      // WHEN - I check its status
      const response = await fetch(`/api/v1/jobs/${jobId}/status`, {
        headers: { 'Content-Type': 'application/json' },
      });

      // THEN - I see completed with result
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.status).toBe('completed');
      expect(body.data.result).toHaveProperty('contentId');
    });
  });

  describe('Scenario: Pipeline Failure (AC-006.6)', () => {
    it('should return failed status with error details', async () => {
      // GIVEN - A pipeline run has failed
      const jobId = 'failed-job-id';

      // WHEN - I check its status
      const response = await fetch(`/api/v1/jobs/${jobId}/status`, {
        headers: { 'Content-Type': 'application/json' },
      });

      // THEN - I see failed with error
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.status).toBe('failed');
      expect(body.data).toHaveProperty('error');
      expect(body.data.error).toBeTruthy();
    });
  });

  describe('Scenario: Pause/Resume Pipeline (AC-006.7)', () => {
    it('should stop scheduled runs when paused but allow manual runs', async () => {
      // GIVEN - An active pipeline with a schedule
      const pipelineId = 'scheduled-pipeline-id';

      // WHEN - I toggle it to paused
      const pauseResponse = await fetch(`/api/v1/pipelines/${pipelineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });

      // THEN - Pipeline is paused
      expect(pauseResponse.status).toBe(200);
      const body = await pauseResponse.json();
      expect(body.data.is_active).toBe(false);

      // AND - I can still run it manually
      const runResponse = await fetch(`/api/v1/pipelines/${pipelineId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(runResponse.status).toBe(202);
    });
  });

  describe('Scenario: Pipeline Validation (AC-005.6)', () => {
    it('should reject invalid pipeline configurations', async () => {
      // GIVEN - An invalid pipeline config (missing required fields)
      const invalidConfig = {
        name: '', // empty name
        project_id: 'project-uuid',
        steps: [], // no agents
      };

      // WHEN - I try to save it
      const response = await fetch('/api/v1/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidConfig),
      });

      // THEN - I get validation errors
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toHaveProperty('details');
      expect(body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'steps' }),
        ])
      );
    });
  });
});
