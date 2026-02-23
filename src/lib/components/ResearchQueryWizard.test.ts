/**
 * @behavior ResearchQueryWizard guides users through 4 steps to create a research query
 * @business_rule Research queries define how content research is automated across providers.
 *   A query must have a name, at least one provider in the chain, and valid settings
 *   before submission.
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const defaultProps = {
  availableProviders: [
    { provider: 'perplexity', name: 'Perplexity' },
    { provider: 'tavily', name: 'Tavily' },
    { provider: 'openai', name: 'OpenAI' }
  ],
  availablePipelines: [
    { id: 'p1', name: 'SEO Pipeline' },
    { id: 'p2', name: 'Social Pipeline' }
  ],
  onComplete: vi.fn(),
  onCancel: vi.fn()
};

describe('ResearchQueryWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 1: Name & Prompt', () => {
    it('should validate query name is required — next btn disabled when name empty', async () => {
      const ResearchQueryWizard = (await import('./ResearchQueryWizard.svelte')).default;

      render(ResearchQueryWizard, { props: { ...defaultProps } });

      const wizardContainer = screen.getByTestId('research-wizard');
      expect(wizardContainer).toBeInTheDocument();

      const stepPanel = screen.getByTestId('wizard-step-1');
      expect(stepPanel).toBeInTheDocument();

      const nameInput = screen.getByTestId('wizard-name-input');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveValue('');

      const nextBtn = screen.getByTestId('wizard-next-btn');
      expect(nextBtn).toBeDisabled();
    });

    it('should accept prompt template with variables — fill name + template, next enabled', async () => {
      const ResearchQueryWizard = (await import('./ResearchQueryWizard.svelte')).default;

      render(ResearchQueryWizard, { props: { ...defaultProps } });

      const nameInput = screen.getByTestId('wizard-name-input');
      await fireEvent.input(nameInput, { target: { value: 'My Research Query' } });

      const promptInput = screen.getByTestId('wizard-prompt-input');
      expect(promptInput).toBeInTheDocument();
      await fireEvent.input(promptInput, {
        target: { value: 'Research {topic} using {keywords}' }
      });

      const nextBtn = screen.getByTestId('wizard-next-btn');
      expect(nextBtn).not.toBeDisabled();
    });
  });

  describe('Step 2: Provider Chain', () => {
    async function goToStep2() {
      const ResearchQueryWizard = (await import('./ResearchQueryWizard.svelte')).default;
      render(ResearchQueryWizard, { props: { ...defaultProps } });

      const nameInput = screen.getByTestId('wizard-name-input');
      await fireEvent.input(nameInput, { target: { value: 'Test Query' } });

      const nextBtn = screen.getByTestId('wizard-next-btn');
      await fireEvent.click(nextBtn);
    }

    it('should show only available providers from props', async () => {
      await goToStep2();

      const stepPanel = screen.getByTestId('wizard-step-2');
      expect(stepPanel).toBeInTheDocument();

      const chainBuilder = screen.getByTestId('provider-chain-builder');
      expect(chainBuilder).toBeInTheDocument();

      // Available providers should be listed for selection
      expect(screen.getByText('Perplexity')).toBeInTheDocument();
      expect(screen.getByText('Tavily')).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('should require at least one provider — next btn disabled with 0 providers', async () => {
      await goToStep2();

      const nextBtn = screen.getByTestId('wizard-next-btn');
      expect(nextBtn).toBeDisabled();
    });
  });

  describe('Step 3: Output Settings', () => {
    async function goToStep3() {
      const ResearchQueryWizard = (await import('./ResearchQueryWizard.svelte')).default;
      render(ResearchQueryWizard, { props: { ...defaultProps } });

      // Step 1: fill name
      const nameInput = screen.getByTestId('wizard-name-input');
      await fireEvent.input(nameInput, { target: { value: 'Test Query' } });
      await fireEvent.click(screen.getByTestId('wizard-next-btn'));

      // Step 2: add a provider
      const addBtn = screen.getByTestId('chain-add-provider');
      await fireEvent.click(addBtn);

      await fireEvent.click(screen.getByTestId('wizard-next-btn'));
    }

    it('should default synthesis mode to unified', async () => {
      await goToStep3();

      const stepPanel = screen.getByTestId('wizard-step-3');
      expect(stepPanel).toBeInTheDocument();

      const unifiedRadio = screen.getByTestId('synthesis-mode-unified');
      expect(unifiedRadio).toBeChecked();
    });

    it('should allow toggling auto-generate topics', async () => {
      await goToStep3();

      const toggle = screen.getByTestId('auto-topics-toggle');
      expect(toggle).toBeInTheDocument();

      // Default should be unchecked
      expect(toggle).not.toBeChecked();

      await fireEvent.click(toggle);
      expect(toggle).toBeChecked();
    });
  });

  describe('Step 4: Schedule & Pipeline', () => {
    async function goToStep4() {
      const ResearchQueryWizard = (await import('./ResearchQueryWizard.svelte')).default;
      render(ResearchQueryWizard, { props: { ...defaultProps } });

      // Step 1
      const nameInput = screen.getByTestId('wizard-name-input');
      await fireEvent.input(nameInput, { target: { value: 'Test Query' } });
      await fireEvent.click(screen.getByTestId('wizard-next-btn'));

      // Step 2: add provider
      await fireEvent.click(screen.getByTestId('chain-add-provider'));
      await fireEvent.click(screen.getByTestId('wizard-next-btn'));

      // Step 3
      await fireEvent.click(screen.getByTestId('wizard-next-btn'));
    }

    it('should allow setting schedule or manual', async () => {
      await goToStep4();

      const stepPanel = screen.getByTestId('wizard-step-4');
      expect(stepPanel).toBeInTheDocument();

      const scheduleSelect = screen.getByTestId('schedule-select');
      expect(scheduleSelect).toBeInTheDocument();
    });

    it('should allow linking to a pipeline', async () => {
      await goToStep4();

      const pipelineSelect = screen.getByTestId('pipeline-select');
      expect(pipelineSelect).toBeInTheDocument();

      // Should contain available pipelines
      const options = pipelineSelect.querySelectorAll('option');
      // none + 2 pipelines = 3
      expect(options.length).toBe(3);
    });
  });

  describe('Full flow', () => {
    it('should call onComplete with correct data on submit', async () => {
      const onComplete = vi.fn();
      const ResearchQueryWizard = (await import('./ResearchQueryWizard.svelte')).default;
      render(ResearchQueryWizard, {
        props: { ...defaultProps, onComplete }
      });

      // Step 1: name + prompt
      const nameInput = screen.getByTestId('wizard-name-input');
      await fireEvent.input(nameInput, { target: { value: 'SEO Research' } });
      const promptInput = screen.getByTestId('wizard-prompt-input');
      await fireEvent.input(promptInput, {
        target: { value: 'Find articles about {topic}' }
      });
      await fireEvent.click(screen.getByTestId('wizard-next-btn'));

      // Step 2: add provider
      await fireEvent.click(screen.getByTestId('chain-add-provider'));
      await fireEvent.click(screen.getByTestId('wizard-next-btn'));

      // Step 3: leave defaults (unified, no auto-topics)
      await fireEvent.click(screen.getByTestId('wizard-next-btn'));

      // Step 4: submit
      const submitBtn = screen.getByTestId('wizard-submit-btn');
      expect(submitBtn).toBeInTheDocument();
      await fireEvent.click(submitBtn);

      expect(onComplete).toHaveBeenCalledOnce();
      const payload = onComplete.mock.calls[0][0];
      expect(payload.name).toBe('SEO Research');
      expect(payload.prompt_template).toBe('Find articles about {topic}');
      expect(payload.provider_chain.length).toBeGreaterThanOrEqual(1);
      expect(payload.synthesis_mode).toBe('unified');
      expect(payload.auto_generate_topics).toBe(false);
      expect(payload).toHaveProperty('schedule');
      expect(payload).toHaveProperty('pipeline_id');
    });

    it('should call onCancel when cancel clicked', async () => {
      const onCancel = vi.fn();
      const ResearchQueryWizard = (await import('./ResearchQueryWizard.svelte')).default;
      render(ResearchQueryWizard, {
        props: { ...defaultProps, onCancel }
      });

      const cancelBtn = screen.getByTestId('wizard-cancel-btn');
      await fireEvent.click(cancelBtn);

      expect(onCancel).toHaveBeenCalledOnce();
    });
  });
});
