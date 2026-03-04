/**
 * @behavior StepSchedule provides human-friendly preset buttons that generate
 * valid cron expressions, a manual toggle to clear the schedule, and a custom
 * frequency builder for advanced use cases
 * @business_rule Users should not need to write raw cron expressions; presets
 * cover common patterns while custom mode allows granular control
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

import StepSchedule from '$lib/components/wizard/StepSchedule.svelte';
import type { WorkflowReviewMode } from '$lib/types/database';

describe('StepSchedule — Schedule Picker', () => {
  let onScheduleChange: ReturnType<typeof vi.fn>;
  let onReviewModeChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onScheduleChange = vi.fn();
    onReviewModeChange = vi.fn();
  });

  function renderComponent(schedule = '', reviewMode: WorkflowReviewMode = 'draft_for_review') {
    return render(StepSchedule, {
      props: {
        schedule,
        reviewMode,
        onScheduleChange,
        onReviewModeChange
      }
    });
  }

  it('should display preset options: Daily, Every weekday, Weekly, Monthly, Custom', () => {
    renderComponent();

    expect(screen.getByTestId('schedule-preset-daily')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-preset-weekday')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-preset-weekly')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-preset-monthly')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-preset-custom')).toBeInTheDocument();
  });

  it('should show custom frequency builder when Custom is selected', async () => {
    renderComponent();

    // Custom builder should not be visible initially
    expect(screen.queryByTestId('schedule-custom-frequency')).not.toBeInTheDocument();

    // Click Custom preset
    await fireEvent.click(screen.getByTestId('schedule-preset-custom'));

    // Custom builder should now be visible
    expect(screen.getByTestId('schedule-custom-frequency')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-custom-unit')).toBeInTheDocument();
  });

  it('should show time-of-day picker for applicable frequencies', async () => {
    renderComponent();

    // Click Daily preset
    await fireEvent.click(screen.getByTestId('schedule-preset-daily'));

    // Time picker should be visible
    expect(screen.getByTestId('schedule-hour-select')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-minute-select')).toBeInTheDocument();
  });

  it('should emit valid cron expression on selection change', async () => {
    renderComponent();

    // Click Daily preset
    await fireEvent.click(screen.getByTestId('schedule-preset-daily'));

    // Should have called onScheduleChange with a daily cron at default time (9:00)
    expect(onScheduleChange).toHaveBeenCalledWith('0 9 * * *');
  });

  it('should support Manual only toggle that clears schedule', async () => {
    renderComponent('0 9 * * *');

    const toggle = screen.getByTestId('schedule-manual-toggle');
    expect(toggle).toBeInTheDocument();

    // Activate manual toggle
    await fireEvent.click(toggle);

    // Should clear the schedule
    expect(onScheduleChange).toHaveBeenCalledWith('');
  });

  it('should prevent invalid custom values (min 1)', async () => {
    renderComponent();

    // Select custom preset
    await fireEvent.click(screen.getByTestId('schedule-preset-custom'));

    const frequencyInput = screen.getByTestId('schedule-custom-frequency') as HTMLInputElement;
    // The input should have min=1
    expect(frequencyInput.min).toBe('1');
  });
});
