/**
 * @behavior scheduleToCron converts human-friendly schedule presets into valid
 * cron expressions; getNextRun calculates the next occurrence from a cron string
 * @business_rule Workflows need predictable scheduling — presets ensure users
 * cannot create invalid cron expressions while custom mode allows flexibility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleToCron, getNextRun } from '$lib/utils/cron-converter';
import type { ScheduleOptions } from '$lib/utils/cron-converter';

describe('scheduleToCron', () => {
  it('should convert "Daily at 9:00 AM" to "0 9 * * *"', () => {
    const options: ScheduleOptions = { preset: 'daily', hour: 9, minute: 0 };
    expect(scheduleToCron(options)).toBe('0 9 * * *');
  });

  it('should convert "Every weekday at 9:00 AM" to "0 9 * * 1-5"', () => {
    const options: ScheduleOptions = { preset: 'weekday', hour: 9, minute: 0 };
    expect(scheduleToCron(options)).toBe('0 9 * * 1-5');
  });

  it('should convert "Weekly on Monday at 9:00 AM" to "0 9 * * 1"', () => {
    const options: ScheduleOptions = { preset: 'weekly', hour: 9, minute: 0, dayOfWeek: 1 };
    expect(scheduleToCron(options)).toBe('0 9 * * 1');
  });

  it('should convert "Monthly on 1st at 9:00 AM" to "0 9 1 * *"', () => {
    const options: ScheduleOptions = { preset: 'monthly', hour: 9, minute: 0, dayOfMonth: 1 };
    expect(scheduleToCron(options)).toBe('0 9 1 * *');
  });

  it('should convert "Every 3 days at 9:00 AM" to "0 9 */3 * *"', () => {
    const options: ScheduleOptions = {
      preset: 'custom',
      hour: 9,
      minute: 0,
      customEvery: 3,
      customUnit: 'days'
    };
    expect(scheduleToCron(options)).toBe('0 9 */3 * *');
  });

  it('should use default hour=9 and minute=0 when not specified', () => {
    const options: ScheduleOptions = { preset: 'daily' };
    expect(scheduleToCron(options)).toBe('0 9 * * *');
  });

  it('should reject invalid values (0 customEvery)', () => {
    const options: ScheduleOptions = {
      preset: 'custom',
      customEvery: 0,
      customUnit: 'days'
    };
    expect(() => scheduleToCron(options)).toThrow();
  });
});

describe('getNextRun', () => {
  beforeEach(() => {
    // Fix time to Wednesday 2026-03-04 08:00:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T08:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should calculate next run date for daily cron "0 9 * * *"', () => {
    const next = getNextRun('0 9 * * *');
    // Next 9:00 UTC is today at 09:00
    expect(next.getUTCHours()).toBe(9);
    expect(next.getUTCMinutes()).toBe(0);
    expect(next.getUTCDate()).toBe(4); // same day, since 9:00 hasn't passed
  });

  it('should roll to next day when time has passed', () => {
    // Set time past 9:00
    vi.setSystemTime(new Date('2026-03-04T10:00:00Z'));
    const next = getNextRun('0 9 * * *');
    expect(next.getUTCDate()).toBe(5); // next day
    expect(next.getUTCHours()).toBe(9);
  });

  it('should handle weekday cron "0 9 * * 1-5"', () => {
    // Wednesday March 4 at 08:00 — next weekday 9:00 is same day
    const next = getNextRun('0 9 * * 1-5');
    expect(next.getUTCDate()).toBe(4);
    expect(next.getUTCHours()).toBe(9);
  });

  it('should skip weekends for weekday cron', () => {
    // Friday March 6 at 10:00 — next weekday 9:00 is Monday March 9
    vi.setSystemTime(new Date('2026-03-06T10:00:00Z'));
    const next = getNextRun('0 9 * * 1-5');
    expect(next.getUTCDate()).toBe(9);
    expect(next.getUTCDay()).toBe(1); // Monday
  });

  it('should handle specific day of week "0 9 * * 1" (Monday)', () => {
    // Wednesday March 4 — next Monday is March 9
    const next = getNextRun('0 9 * * 1');
    expect(next.getUTCDate()).toBe(9);
    expect(next.getUTCDay()).toBe(1);
  });

  it('should handle monthly cron "0 9 1 * *"', () => {
    // March 4 — next 1st is April 1
    const next = getNextRun('0 9 1 * *');
    expect(next.getUTCMonth()).toBe(3); // April (0-indexed)
    expect(next.getUTCDate()).toBe(1);
  });
});
