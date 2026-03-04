<script lang="ts">
  import type { WorkflowReviewMode } from '$lib/types/database';
  import { scheduleToCron } from '$lib/utils/cron-converter';
  import type { SchedulePreset } from '$lib/utils/cron-converter';

  let {
    schedule,
    reviewMode,
    onScheduleChange,
    onReviewModeChange
  }: {
    schedule: string;
    reviewMode: WorkflowReviewMode;
    onScheduleChange: (value: string) => void;
    onReviewModeChange: (value: WorkflowReviewMode) => void;
  } = $props();

  let isManual = $state(false);
  let selectedPreset = $state<SchedulePreset | null>(null);
  let hour = $state(9);
  let minute = $state(0);
  let customEvery = $state(1);
  let customUnit = $state<'days' | 'weeks' | 'months'>('days');

  function emitCron() {
    if (isManual || !selectedPreset) return;
    const cron = scheduleToCron({
      preset: selectedPreset,
      hour,
      minute,
      dayOfWeek: 1,
      dayOfMonth: 1,
      customEvery,
      customUnit
    });
    onScheduleChange(cron);
  }

  function selectPreset(preset: SchedulePreset) {
    isManual = false;
    selectedPreset = preset;
    emitCron();
  }

  function toggleManual() {
    isManual = !isManual;
    if (isManual) {
      selectedPreset = null;
      onScheduleChange('');
    }
  }

  function handleHourChange(e: Event) {
    hour = parseInt((e.target as HTMLSelectElement).value, 10);
    emitCron();
  }

  function handleMinuteChange(e: Event) {
    minute = parseInt((e.target as HTMLSelectElement).value, 10);
    emitCron();
  }

  function handleFrequencyChange(e: Event) {
    customEvery = Math.max(1, parseInt((e.target as HTMLInputElement).value, 10) || 1);
    emitCron();
  }

  function handleUnitChange(e: Event) {
    customUnit = (e.target as HTMLSelectElement).value as 'days' | 'weeks' | 'months';
    emitCron();
  }
</script>

<div data-testid="step-schedule">
  <h2 class="text-lg font-semibold text-base-content mb-4">Schedule & Review</h2>

  <div class="mb-4">
    <label class="flex items-center gap-2 cursor-pointer mb-4">
      <input
        data-testid="schedule-manual-toggle"
        type="checkbox"
        class="toggle toggle-primary toggle-sm"
        checked={isManual}
        onchange={toggleManual}
      />
      <span class="text-sm text-base-content/70">Manual only (no schedule)</span>
    </label>
  </div>

  {#if !isManual}
    <div class="mb-4">
      <label class="block text-base-content/70 text-sm mb-2">Frequency</label>
      <div class="flex flex-wrap gap-2">
        <button
          data-testid="schedule-preset-daily"
          type="button"
          class="btn btn-sm {selectedPreset === 'daily' ? 'btn-primary' : 'btn-outline'}"
          onclick={() => selectPreset('daily')}
        >Daily</button>
        <button
          data-testid="schedule-preset-weekday"
          type="button"
          class="btn btn-sm {selectedPreset === 'weekday' ? 'btn-primary' : 'btn-outline'}"
          onclick={() => selectPreset('weekday')}
        >Every weekday</button>
        <button
          data-testid="schedule-preset-weekly"
          type="button"
          class="btn btn-sm {selectedPreset === 'weekly' ? 'btn-primary' : 'btn-outline'}"
          onclick={() => selectPreset('weekly')}
        >Weekly</button>
        <button
          data-testid="schedule-preset-monthly"
          type="button"
          class="btn btn-sm {selectedPreset === 'monthly' ? 'btn-primary' : 'btn-outline'}"
          onclick={() => selectPreset('monthly')}
        >Monthly</button>
        <button
          data-testid="schedule-preset-custom"
          type="button"
          class="btn btn-sm {selectedPreset === 'custom' ? 'btn-primary' : 'btn-outline'}"
          onclick={() => selectPreset('custom')}
        >Custom</button>
      </div>
    </div>

    {#if selectedPreset === 'custom'}
      <div class="mb-4 flex items-center gap-2">
        <label class="text-sm text-base-content/70">Every</label>
        <input
          data-testid="schedule-custom-frequency"
          type="number"
          min="1"
          value={customEvery}
          oninput={handleFrequencyChange}
          class="input input-bordered input-sm w-20"
        />
        <select
          data-testid="schedule-custom-unit"
          value={customUnit}
          onchange={handleUnitChange}
          class="select select-bordered select-sm"
        >
          <option value="days">days</option>
          <option value="weeks">weeks</option>
          <option value="months">months</option>
        </select>
      </div>
    {/if}

    {#if selectedPreset}
      <div class="mb-4 flex items-center gap-2">
        <label class="text-sm text-base-content/70">At</label>
        <select
          data-testid="schedule-hour-select"
          value={hour}
          onchange={handleHourChange}
          class="select select-bordered select-sm w-20"
        >
          {#each Array.from({ length: 24 }, (_, i) => i) as h}
            <option value={h}>{String(h).padStart(2, '0')}</option>
          {/each}
        </select>
        <span class="text-base-content/70">:</span>
        <select
          data-testid="schedule-minute-select"
          value={minute}
          onchange={handleMinuteChange}
          class="select select-bordered select-sm w-20"
        >
          {#each [0, 15, 30, 45] as m}
            <option value={m}>{String(m).padStart(2, '0')}</option>
          {/each}
        </select>
      </div>
    {/if}
  {/if}

  <div class="mb-4">
    <label class="block text-base-content/70 text-sm mb-1" for="review-mode">Review Mode</label>
    <select
      id="review-mode"
      data-testid="review-mode-select"
      value={reviewMode}
      onchange={(e) => onReviewModeChange((e.target as HTMLSelectElement).value as WorkflowReviewMode)}
      class="select select-bordered w-full"
    >
      <option value="draft_for_review">Draft for Review</option>
      <option value="auto_publish">Auto Publish</option>
    </select>
  </div>
</div>
