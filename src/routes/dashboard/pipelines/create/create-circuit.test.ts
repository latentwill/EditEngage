/**
 * @behavior The /dashboard/pipelines/create route renders the CircuitWizard
 * component so users can build a new content circuit through a guided wizard.
 * @business_rule Every new circuit must be created through the wizard flow
 * which collects name, agents, and configuration before saving.
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import CreatePage from './+page.svelte';

describe('Create Circuit Route', () => {
  it('renders CircuitWizard component', () => {
    render(CreatePage, {
      props: {
        data: { activeProjectId: 'proj-123' }
      }
    });

    const container = screen.getByTestId('circuit-wizard-container');
    expect(container).toBeInTheDocument();

    // The CircuitWizard should render its wizard inside
    const wizard = screen.getByTestId('pipeline-wizard');
    expect(wizard).toBeInTheDocument();
  });
});
