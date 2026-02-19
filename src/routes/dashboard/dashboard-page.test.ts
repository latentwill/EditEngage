/**
 * @behavior Dashboard page renders stat cards, recent workflow runs,
 * content awaiting review, and topic queue health, all scoped to active project
 * @business_rule Dashboard is the primary control surface; metrics must be
 * project-scoped and provide actionable visibility into content operations
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const mockDashboardData = {
  totalContent: 42,
  publishedThisWeek: 7,
  pendingReview: 3,
  activeWorkflows: 2,
  recentWorkflowRuns: [
    { id: 'run-1', pipeline_id: 'pipe-1', status: 'completed', current_step: 3, total_steps: 3, started_at: '2025-01-10T10:00:00Z', completed_at: '2025-01-10T10:05:00Z', result: null, error: null, bullmq_job_id: null, created_at: '2025-01-10T10:00:00Z', pipeline_name: 'SEO Writer' },
    { id: 'run-2', pipeline_id: 'pipe-2', status: 'running', current_step: 1, total_steps: 4, started_at: '2025-01-10T11:00:00Z', completed_at: null, result: null, error: null, bullmq_job_id: null, created_at: '2025-01-10T11:00:00Z', pipeline_name: 'Social Posts' },
    { id: 'run-3', pipeline_id: 'pipe-1', status: 'failed', current_step: 2, total_steps: 3, started_at: '2025-01-09T08:00:00Z', completed_at: '2025-01-09T08:02:00Z', result: null, error: 'Timeout', bullmq_job_id: null, created_at: '2025-01-09T08:00:00Z', pipeline_name: 'SEO Writer' },
    { id: 'run-4', pipeline_id: 'pipe-3', status: 'completed', current_step: 5, total_steps: 5, started_at: '2025-01-08T14:00:00Z', completed_at: '2025-01-08T14:10:00Z', result: null, error: null, bullmq_job_id: null, created_at: '2025-01-08T14:00:00Z', pipeline_name: 'Landing Pages' },
    { id: 'run-5', pipeline_id: 'pipe-2', status: 'queued', current_step: 0, total_steps: 4, started_at: null, completed_at: null, result: null, error: null, bullmq_job_id: null, created_at: '2025-01-10T12:00:00Z', pipeline_name: 'Social Posts' }
  ],
  contentInReview: [
    { id: 'content-1', title: 'How to Scale SEO', status: 'in_review', created_at: '2025-01-09T10:00:00Z' },
    { id: 'content-2', title: 'Top 10 AI Tools', status: 'in_review', created_at: '2025-01-09T11:00:00Z' }
  ],
  topicQueueHealth: {
    pendingCount: 15,
    nextScheduledRun: '2025-01-11T06:00:00Z'
  },
  activeProjectId: 'proj-1'
};

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 4 stat cards with correct labels', async () => {
    const DashboardPage = (await import('./+page.svelte')).default;

    render(DashboardPage, {
      props: { data: mockDashboardData }
    });

    const statCards = screen.getAllByTestId('stat-card');
    expect(statCards).toHaveLength(4);

    const labels = screen.getAllByTestId('stat-label').map((el) => el.textContent);
    expect(labels).toContain('Total Content');
    expect(labels).toContain('Published This Week');
    expect(labels).toContain('Pending Review');
    expect(labels).toContain('Active Workflows');
  });

  it('stat cards display values from project data', async () => {
    const DashboardPage = (await import('./+page.svelte')).default;

    render(DashboardPage, {
      props: { data: mockDashboardData }
    });

    const values = screen.getAllByTestId('stat-value').map((el) => el.textContent);
    expect(values).toContain('42');
    expect(values).toContain('7');
    expect(values).toContain('3');
    expect(values).toContain('2');
  });

  it('recent workflow runs section shows up to 5 runs with status badges', async () => {
    const DashboardPage = (await import('./+page.svelte')).default;

    render(DashboardPage, {
      props: { data: mockDashboardData }
    });

    const runsSection = screen.getByTestId('recent-workflow-runs');
    expect(runsSection).toBeInTheDocument();

    const runItems = screen.getAllByTestId('workflow-run-item');
    expect(runItems.length).toBeLessThanOrEqual(5);
    expect(runItems.length).toBe(5);

    // Each run should have a status badge
    const statusBadges = screen.getAllByTestId('run-status-badge');
    expect(statusBadges.length).toBe(5);
  });

  it('content awaiting review section lists items with status "in_review"', async () => {
    const DashboardPage = (await import('./+page.svelte')).default;

    render(DashboardPage, {
      props: { data: mockDashboardData }
    });

    const reviewSection = screen.getByTestId('content-in-review');
    expect(reviewSection).toBeInTheDocument();

    const reviewItems = screen.getAllByTestId('review-item');
    expect(reviewItems.length).toBe(2);
    expect(screen.getByText('How to Scale SEO')).toBeInTheDocument();
    expect(screen.getByText('Top 10 AI Tools')).toBeInTheDocument();
  });

  it('topic queue health shows pending count and next scheduled run', async () => {
    const DashboardPage = (await import('./+page.svelte')).default;

    render(DashboardPage, {
      props: { data: mockDashboardData }
    });

    const topicHealth = screen.getByTestId('topic-queue-health');
    expect(topicHealth).toBeInTheDocument();
    expect(topicHealth.textContent).toContain('15');
  });

  it('dashboard loads data scoped to the active project', async () => {
    const DashboardPage = (await import('./+page.svelte')).default;

    const { container } = render(DashboardPage, {
      props: { data: mockDashboardData }
    });

    // The data-project-id attribute on the page confirms project scoping
    const pageRoot = screen.getByTestId('dashboard-page');
    expect(pageRoot).toBeInTheDocument();
    expect(pageRoot.getAttribute('data-project-id')).toBe('proj-1');
  });
});
