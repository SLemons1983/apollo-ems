import { describe, expect, it } from 'vitest';
import { addDays, getPayPeriodInfo } from './payPeriods';

// Runs in America/Los_Angeles (see vitest.config.ts), ApolloEMS's operating
// timezone, so daylight-saving transitions are exercised.
describe('pay period keys', () => {
  it('runs in the expected timezone', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles');
  });

  it('matches the reference period', () => {
    const info = getPayPeriodInfo(new Date(2026, 3, 12, 12));
    expect(info.key).toBe('2026-pp-9');
    expect(info.start.getDate()).toBe(12);
    expect(info.end.getDate()).toBe(25);
  });

  it('gives every day of a 14-day period the same key, across DST changes, for two years', () => {
    let day = new Date(2026, 0, 1, 0, 0, 0);
    const end = new Date(2027, 11, 31);
    const keyStarts = new Map<string, number>();

    while (day <= end) {
      for (const hour of [0, 1, 2, 3, 12, 23]) {
        const moment = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 30);
        const info = getPayPeriodInfo(moment);
        const start = info.start.getTime();
        if (keyStarts.has(info.key)) expect(keyStarts.get(info.key)).toBe(start);
        else keyStarts.set(info.key, start);
        expect(moment.getTime()).toBeGreaterThanOrEqual(start);
        expect(info.start.getDay()).toBe(0);
        expect(info.start.getHours()).toBe(0);
      }
      day = addDays(day, 1);
    }

    const starts = [...keyStarts.values()].sort((a, b) => a - b);
    for (let index = 1; index < starts.length; index += 1) {
      const days = Math.round((starts[index] - starts[index - 1]) / 86_400_000);
      expect(days).toBe(14);
    }
  });

  it('periods spanning the November and March DST changes keep 14 calendar days', () => {
    [new Date(2026, 10, 1, 12), new Date(2027, 2, 14, 12)].forEach((dstDay) => {
      const info = getPayPeriodInfo(dstDay);
      expect(addDays(info.start, 13).toDateString()).toBe(info.end.toDateString());
      expect(getPayPeriodInfo(info.end).key).toBe(info.key);
      expect(getPayPeriodInfo(addDays(info.end, 1)).key).not.toBe(info.key);
    });
  });
});
