import { useCallback, useEffect, useRef } from 'react';

// Helpers shared by the supervisor page and its tile components.

export type EmployeeCertificationRecord = Record<string, string>;

export type EmployeeOption = {
  id: string;
  name: string;
  email: string;
  role: 'Paramedic' | 'EMT' | 'Supervisor';
  scope: 'ALS' | 'BLS';
  employeeType: string;
  status: string;
  certifications?: EmployeeCertificationRecord | null;
};

export type ImportantLink = {
  id: string;
  label: string;
  url: string;
};

export type GeofenceConfig = {
  id: string;
  shiftLabel: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  radiusFeet: number;
};

export type SystemConfig = {
  companyName: string;
  logoDataUrl: string;
  importantLinks: ImportantLink[];
  geofences: GeofenceConfig[];
};

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
};

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

export function makeDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Records in `next` that are new or differ from their copy in `previous`.
// Saving only these keeps one supervisor's stale copy of untouched rows from
// overwriting changes other people made since this page loaded.
export function getChangedRecords<T extends { id: string }>(previous: T[], next: T[]): T[] {
  const previousById = new Map(previous.map((record) => [record.id, JSON.stringify(record)]));
  return next.filter((record) => previousById.get(record.id) !== JSON.stringify(record));
}

// Replaces the records covered by a refresh with freshly fetched copies. It
// returns `current` itself when nothing changed so React skips the re-render,
// and reuses unchanged record objects so memoized views stay stable.
export function mergeRefreshedRecords<T extends { id: string }>(
  current: T[],
  fetched: T[],
  isCoveredByRefresh: (record: T) => boolean,
): T[] {
  const currentById = new Map(current.map((record) => [record.id, record]));
  const fetchedIds = new Set(fetched.map((record) => record.id));
  let changed = false;

  const refreshed = fetched.map((record) => {
    const existing = currentById.get(record.id);
    if (existing && JSON.stringify(existing) === JSON.stringify(record)) {
      return existing;
    }
    changed = true;
    return record;
  });

  const untouched = current.filter((record) => {
    if (fetchedIds.has(record.id)) return false;
    if (isCoveredByRefresh(record)) {
      changed = true;
      return false;
    }
    return true;
  });

  return changed ? [...untouched, ...refreshed] : current;
}

// A function whose identity never changes but always calls the latest
// `callback`. Passing these to memoized tiles keeps closed tiles from
// re-rendering whenever the page does.
export function useStableCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback((...args: Args) => callbackRef.current(...args), []);
}
