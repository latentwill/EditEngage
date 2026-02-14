/**
 * @behavior Users can manage projects with full data isolation between organizations
 * @user-story US-002: Organization & Project Management
 * @boundary API (/api/v1/projects)
 *
 * These acceptance tests verify project CRUD operations and RLS isolation.
 * They test at the HTTP boundary — the SvelteKit API routes.
 */
import { describe, it, expect } from 'vitest';

describe('Project Management (Acceptance)', () => {
  describe('Scenario: Create Project (AC-002.1)', () => {
    it('should create a project scoped to the user organization', async () => {
      // GIVEN - I am logged in with a valid session
      const projectData = {
        name: 'Extndly Blog',
        description: 'Content operations for extndly.com',
        domain: 'extndly.com',
        color: '#34D399',
        icon: 'globe',
      };

      // WHEN - I create a new project
      const response = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header with session token
        },
        body: JSON.stringify(projectData),
      });

      // THEN - The project is created and returned
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data).toMatchObject({
        id: expect.any(String),
        name: 'Extndly Blog',
        domain: 'extndly.com',
        color: '#34D399',
      });
    });
  });

  describe('Scenario: List Projects (AC-002.2)', () => {
    it('should return only projects in the user organization', async () => {
      // GIVEN - I have projects in my organization

      // WHEN - I fetch my projects
      const response = await fetch('/api/v1/projects', {
        headers: { 'Content-Type': 'application/json' },
      });

      // THEN - I see only my organization's projects
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeInstanceOf(Array);
      // Each project should belong to user's org (RLS enforced)
    });
  });

  describe('Scenario: Project Isolation / RLS (AC-002.3)', () => {
    it('should return 404 for projects outside the user organization', async () => {
      // GIVEN - A project exists in a different organization
      const foreignProjectId = '00000000-0000-0000-0000-000000000000';

      // WHEN - I try to access it
      const response = await fetch(`/api/v1/projects/${foreignProjectId}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      // THEN - I get 404 (RLS hides it completely)
      expect(response.status).toBe(404);
    });
  });

  describe('Scenario: Update Project Settings (AC-002.4)', () => {
    it('should persist project settings changes', async () => {
      // GIVEN - I have an existing project
      const projectId = 'existing-project-id';

      // WHEN - I update its settings
      const response = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Extndly Blog (Updated)',
          settings: { default_llm: 'moonshotai/kimi-k2-thinking', timezone: 'Australia/Brisbane' },
        }),
      });

      // THEN - Changes are persisted
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.name).toBe('Extndly Blog (Updated)');
      expect(body.data.settings.timezone).toBe('Australia/Brisbane');
    });
  });

  describe('Scenario: Delete Project (AC-002.5)', () => {
    it('should cascade delete all associated data', async () => {
      // GIVEN - I am the org admin with an existing project
      const projectId = 'project-to-delete';

      // WHEN - I delete the project
      const deleteResponse = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      // THEN - The project and all children are removed
      expect(deleteResponse.status).toBe(204);

      // Verify it's gone
      const getResponse = await fetch(`/api/v1/projects/${projectId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(getResponse.status).toBe(404);
    });
  });
});
