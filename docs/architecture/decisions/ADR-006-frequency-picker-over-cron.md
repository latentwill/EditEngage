# ADR-006: Human-Friendly Frequency Picker Over Raw Cron Input

**Date:** 2026-03-03
**Status:** Accepted
**Deciders:** Ed Kennedy

## Context

The workflow schedule step (StepSchedule.svelte) uses a raw cron expression text input. Users must understand cron syntax to set a schedule. This is a poor UX for content creators who are not developers.

## Research

| Option | Pros | Cons | Fit |
|--------|------|------|-----|
| Frequency picker with presets | Intuitive, covers common cases | Complex schedules harder | Best |
| Visual calendar picker | Very visual | Over-engineered for recurring schedules | Poor |
| Cron with helper text | Minimal change | Still exposes cron syntax | Poor |

## Decision

Replace the cron text input with a frequency builder:
- **Presets**: Daily, Every weekday, Weekly, Monthly
- **Custom builder**: "Every X days", "X times per day", "X times per week", "X times per month"
- **Time-of-day selector** when applicable
- Under the hood, selections convert to a cron expression for storage — user never sees cron
- "Manual only" toggle for on-demand-only workflows
- Each workflow card shows "Next run: [date/time]" calculated from the cron

## Consequences

### Positive
- Non-technical users can schedule workflows without cron knowledge
- "Next run" display gives immediate visibility into scheduling
- Presets cover 80% of use cases with one click

### Negative
- Very complex schedules (e.g., "every 3rd Tuesday") not supported without extending the builder
- Cron conversion logic needs to be correct and well-tested

### Neutral
- Storage format unchanged (still cron string in `pipelines.schedule`)
- Scheduler/worker code unaffected
