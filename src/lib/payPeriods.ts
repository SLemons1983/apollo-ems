export type PayPeriodOption = {
  key: string;
  year: number;
  number: number;
  start: Date;
  end: Date;
};

const PAY_PERIOD_REFERENCE_START = '2026-04-12';
const PAY_PERIOD_REFERENCE_NUMBER = 9;
const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getSundayStart(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export function getGlobalPayPeriodStart(date: Date): Date {
  const referenceStart = new Date(`${PAY_PERIOD_REFERENCE_START}T00:00:00`);
  const sunday = getSundayStart(date);
  const diffDays = Math.round((sunday.getTime() - referenceStart.getTime()) / DAY_MS);
  const offsetWithinCycle = ((diffDays % 14) + 14) % 14;
  return addDays(sunday, -offsetWithinCycle);
}

export function getPayPeriodInfo(date: Date): PayPeriodOption {
  const periodStart = getGlobalPayPeriodStart(date);
  const periodEnd = addDays(periodStart, 13);
  const referenceStart = new Date(`${PAY_PERIOD_REFERENCE_START}T00:00:00`);
  const diffDays = Math.round((periodStart.getTime() - referenceStart.getTime()) / DAY_MS);

  return {
    key: `${periodStart.getFullYear()}-pp-${Math.floor(diffDays / 14) + PAY_PERIOD_REFERENCE_NUMBER}`,
    year: periodStart.getFullYear(),
    number: Math.floor(diffDays / 14) + PAY_PERIOD_REFERENCE_NUMBER,
    start: periodStart,
    end: periodEnd,
  };
}

export function buildPayPeriodOptions(baseDate: Date, count = 28): PayPeriodOption[] {
  const current = getPayPeriodInfo(baseDate);
  const start = addDays(current.start, -14 * Math.floor(count / 2));

  return Array.from({ length: count }, (_, index) => getPayPeriodInfo(addDays(start, index * 14)));
}

export function getPayPeriodsForYear(year: number): PayPeriodOption[] {
  const janFirst = new Date(year, 0, 1);
  const nextJanFirst = new Date(year + 1, 0, 1);
  const firstStart = getGlobalPayPeriodStart(janFirst);
  const firstStartNextYear = getGlobalPayPeriodStart(nextJanFirst);

  const periods: PayPeriodOption[] = [];
  for (let currentStart = new Date(firstStart); currentStart < firstStartNextYear; currentStart = addDays(currentStart, 14)) {
    periods.push(getPayPeriodInfo(currentStart));
  }

  return periods;
}

export function getCurrentPayPeriodOption(options: PayPeriodOption[], currentDate: Date): PayPeriodOption {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  return (
    options.find((option) => {
      const start = new Date(option.start);
      const end = new Date(option.end);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return today >= start && today <= end;
    }) ?? getPayPeriodInfo(currentDate)
  );
}
