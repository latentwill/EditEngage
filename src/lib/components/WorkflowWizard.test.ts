/**
 * @behavior WorkflowWizard renders a multi-step wizard (Steps 1-2) for creating
 * a content workflow. Step 1 collects name/description with validation. Step 2
 * lets users select and reorder agent types.
 * @business_rule A workflow must have a name before proceeding. At least one
 * agent must be selected to move past Step 2. Agent ordering determines
 * execution sequence.
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkflowWizard from './WorkflowWizard.svelte';

describe('WorkflowWizard — Step 1: Name & Description', () => {
  it('renders name and description inputs with validation', () => {
    render(WorkflowWizard);

    const nameInput = screen.getByTestId('workflow-name-input');
    const descInput = screen.getByTestId('workflow-description-input');
    const nextBtn = screen.getByTestId('wizard-next-btn');

    expect(nameInput).toBeInTheDocument();
    expect(descInput).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
  });

  it('blocks progression when name is empty', async () => {
    render(WorkflowWizard);

    const nextBtn = screen.getByTestId('wizard-next-btn');
    await fireEvent.click(nextBtn);

    // Should still be on step 1 — step indicator shows step 1 active
    const stepIndicator = screen.getByTestId('wizard-step-indicator');
    expect(stepIndicator.textContent).toContain('1');

    // Validation error should appear
    const error = screen.getByTestId('name-validation-error');
    expect(error).toBeInTheDocument();
  });
});

describe('WorkflowWizard — Step 2: Agent Selection', () => {
  async function goToStep2() {
    render(WorkflowWizard);

    // Fill in name to pass step 1 validation
    const nameInput = screen.getByTestId('workflow-name-input');
    await fireEvent.input(nameInput, { target: { value: 'My Pipeline' } });

    // Navigate to step 2
    const nextBtn = screen.getByTestId('wizard-next-btn');
    await fireEvent.click(nextBtn);
  }

  it('renders available agent types as selectable cards', async () => {
    await goToStep2();

    const agentCards = screen.getAllByTestId('agent-card');
    expect(agentCards.length).toBeGreaterThanOrEqual(5);

    // Each card should have an agent type label
    const seoWriter = screen.getByTestId('agent-card-seo_writer');
    expect(seoWriter).toBeInTheDocument();

    const ghostPublisher = screen.getByTestId('agent-card-ghost_publisher');
    expect(ghostPublisher).toBeInTheDocument();
  });

  it('allows reordering selected agents via drag handles', async () => {
    await goToStep2();

    // Select two agents
    const seoWriter = screen.getByTestId('agent-card-seo_writer');
    const ghostPublisher = screen.getByTestId('agent-card-ghost_publisher');
    await fireEvent.click(seoWriter);
    await fireEvent.click(ghostPublisher);

    // Both should appear in the selected list
    const selectedList = screen.getByTestId('selected-agents-list');
    expect(selectedList).toBeInTheDocument();

    // Drag handles should be visible for reordering
    const dragHandles = screen.getAllByTestId('agent-drag-handle');
    expect(dragHandles.length).toBe(2);

    // Click move-down on first selected agent to reorder
    const moveDownBtns = screen.getAllByTestId('agent-move-down');
    await fireEvent.click(moveDownBtns[0]);

    // After reordering, the selected agents order should swap
    const selectedItems = screen.getAllByTestId('selected-agent-item');
    expect(selectedItems[0].textContent).toContain('Ghost Publisher');
    expect(selectedItems[1].textContent).toContain('SEO Writer');
  });

  it('blocks progression when no agents are selected', async () => {
    await goToStep2();

    // Try to go to step 3 without selecting agents
    const nextBtn = screen.getByTestId('wizard-next-btn');
    await fireEvent.click(nextBtn);

    // Should still be on step 2
    const stepIndicator = screen.getByTestId('wizard-step-indicator');
    expect(stepIndicator.textContent).toContain('2');

    // Validation error should appear
    const error = screen.getByTestId('agents-validation-error');
    expect(error).toBeInTheDocument();
  });
});
