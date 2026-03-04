export type SchedulePreset = 'daily' | 'weekday' | 'weekly' | 'monthly' | 'custom';

export interface ScheduleOptions {
  preset: SchedulePreset;
  hour?: number;
  minute?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  customEvery?: number;
  customUnit?: 'days' | 'weeks' | 'months';
}

export function scheduleToCron(options: ScheduleOptions): string {
  const hour = options.hour ?? 9;
  const minute = options.minute ?? 0;

  switch (options.preset) {
    case 'daily':
      return `${minute} ${hour} * * *`;
    case 'weekday':
      return `${minute} ${hour} * * 1-5`;
    case 'weekly': {
      const dow = options.dayOfWeek ?? 1;
      return `${minute} ${hour} * * ${dow}`;
    }
    case 'monthly': {
      const dom = options.dayOfMonth ?? 1;
      return `${minute} ${hour} ${dom} * *`;
    }
    case 'custom': {
      const every = options.customEvery;
      if (!every || every < 1) {
        throw new Error('customEvery must be at least 1');
      }
      const unit = options.customUnit ?? 'days';
      if (unit === 'days') {
        return `${minute} ${hour} */${every} * *`;
      }
      if (unit === 'weeks') {
        return `${minute} ${hour} * * */${every}`;
      }
      // months
      return `${minute} ${hour} 1 */${every} *`;
    }
  }
}

export function getNextRun(cronExpression: string): Date {
  const parts = cronExpression.split(' ');
  const cronMinute = parseInt(parts[0], 10);
  const cronHour = parseInt(parts[1], 10);
  const dayOfMonthPart = parts[2];
  const dowPart = parts[4];

  const now = new Date();
  const candidate = new Date(now);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(cronMinute);
  candidate.setUTCHours(cronHour);

  // Monthly: specific day of month
  if (dayOfMonthPart !== '*' && !dayOfMonthPart.startsWith('*/')) {
    const targetDay = parseInt(dayOfMonthPart, 10);
    candidate.setUTCDate(targetDay);
    if (candidate <= now) {
      candidate.setUTCMonth(candidate.getUTCMonth() + 1);
    }
    return candidate;
  }

  // Every N days
  if (dayOfMonthPart.startsWith('*/')) {
    if (candidate <= now) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    return candidate;
  }

  // Day-of-week range (e.g., 1-5 for weekdays)
  if (dowPart.includes('-')) {
    const [startDow, endDow] = dowPart.split('-').map(Number);
    // Try today first
    if (candidate > now && candidate.getUTCDay() >= startDow && candidate.getUTCDay() <= endDow) {
      return candidate;
    }
    // Advance day by day until we hit a matching weekday
    candidate.setUTCDate(candidate.getUTCDate() + 1);
    for (let i = 0; i < 7; i++) {
      const dow = candidate.getUTCDay();
      if (dow >= startDow && dow <= endDow) {
        return candidate;
      }
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    return candidate;
  }

  // Specific day of week (single number)
  if (dowPart !== '*' && !dowPart.startsWith('*/')) {
    const targetDow = parseInt(dowPart, 10);
    // If today matches and time hasn't passed
    if (candidate > now && candidate.getUTCDay() === targetDow) {
      return candidate;
    }
    // Find next occurrence
    candidate.setUTCDate(candidate.getUTCDate() + 1);
    for (let i = 0; i < 7; i++) {
      if (candidate.getUTCDay() === targetDow) {
        return candidate;
      }
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    return candidate;
  }

  // Daily: * * pattern
  if (candidate <= now) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate;
}
