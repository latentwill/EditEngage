<script lang="ts">
  import type { PipelineReviewMode } from '$lib/types/database';

  let {
    schedule,
    reviewMode,
    onScheduleChange,
    onReviewModeChange
  }: {
    schedule: string;
    reviewMode: PipelineReviewMode;
    onScheduleChange: (value: string) => void;
    onReviewModeChange: (value: PipelineReviewMode) => void;
  } = $props();
</script>

<div data-testid="step-schedule">
  <h2 class="text-lg font-semibold text-white mb-4">Schedule & Review</h2>

  <div class="mb-4">
    <label class="block text-white/70 text-sm mb-1" for="cron-schedule">Cron Schedule</label>
    <input
      id="cron-schedule"
      data-testid="cron-schedule-input"
      type="text"
      value={schedule}
      oninput={(e) => onScheduleChange((e.target as HTMLInputElement).value)}
      class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
      placeholder="0 9 * * 1 (every Monday at 9am)"
    />
    <p class="text-white/30 text-xs mt-1">Leave empty for manual runs only</p>
  </div>

  <div class="mb-4">
    <label class="block text-white/70 text-sm mb-1" for="review-mode">Review Mode</label>
    <select
      id="review-mode"
      data-testid="review-mode-select"
      value={reviewMode}
      onchange={(e) => onReviewModeChange((e.target as HTMLSelectElement).value as PipelineReviewMode)}
      class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/30"
    >
      <option value="draft_for_review">Draft for Review</option>
      <option value="auto_publish">Auto Publish</option>
    </select>
  </div>
</div>
