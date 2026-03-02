/**
 * @behavior The /dashboard/workflows/create route renders the WorkflowWizard
 * component so users can build a new workflow through a guided wizard.
 * @business_rule Every new workflow must be created through the wizard flow
 * which collects name, agents, and configuration before saving.
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import CreatePage from './+page.svelte';

describe('Create Workflow Route', () => {
  it('renders WorkflowWizard component', () => {
    render(CreatePage, {
      props: {
        data: {
          activeProjectId: 'proj-123',
          projects: [],
          orgId: 'org-1',
          session: { user: { id: 'user-1', email: 'test@example.com' } }
        }
      }
    });

    const container = screen.getByTestId('workflow-wizard-container');
    expect(container).toBeInTheDocument();

    // The WorkflowWizard should render its wizard inside
    const wizard = screen.getByTestId('workflow-wizard');
    expect(wizard).toBeInTheDocument();
  });
});
