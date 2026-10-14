import { describe, expect, it } from 'vitest';
import {
  buildRestoreRpcRows,
  decideReturnedTimecardRestore,
  isMissingDatabaseFunctionError,
  isRestoreRpcResult,
  getEditableRowPrefix,
  getRestoreMarkerRowId,
  savedRowsChangedAfterReturn,
} from './timecardWorkflow';

// Simulates the editable_timecard_rows table and the dashboard's restore
// sequence (fresh read -> decide -> one combined write) with synthetic data.

type Row = {
  id: string;
  updated_at: string;
  row_data: { clockIn?: string; clockOut?: string; deleted?: boolean; restoreMarker?: boolean; restoredFromTimecardId?: string };
};

const EMP = 'emp-synthetic-restore';
const PERIOD = '2026-pp-20';
const PREFIX = getEditableRowPrefix(EMP, PERIOD);
const ROW = `${PREFIX}2026-10-06`;

class EditableRowsTable {
  rows = new Map<string, Row>();
  failNextWrite = false;
  writes = 0;

  upsert(rows: Row[]) {
    // PostgREST bulk upsert is a single statement: all rows or none.
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error('simulated network failure');
    }
    this.writes += 1;
    rows.forEach((row) => this.rows.set(row.id, structuredClone(row)));
  }

  read() {
    return [...this.rows.values()].map((row) => structuredClone(row));
  }
}

/** The employee edits a row (every dashboard edit path stamps updated_at). */
function employeeEdits(table: EditableRowsTable, at: string, clockOut: string) {
  table.upsert([{ id: ROW, updated_at: at, row_data: { clockIn: '07:00', clockOut } }]);
}

/** Mirrors restoreEditableRowsFromReturnedTimecard in the dashboard. */
function restore(
  table: EditableRowsTable,
  returned: { id: string; reviewedAt: string; clockOut: string },
  now: string,
) {
  const markerId = getRestoreMarkerRowId(EMP, PERIOD, returned.id);
  const fresh = table.read();
  const markerExists = fresh.some(
    (row) => row.id === markerId || (row.row_data.restoreMarker && row.row_data.restoredFromTimecardId === returned.id),
  );
  const latestSavedRowUpdatedAt = fresh
    .filter((row) => !row.row_data.restoreMarker)
    .map((row) => row.updated_at)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

  const action = decideReturnedTimecardRestore({
    markerExists,
    latestSavedRowUpdatedAt,
    returnedReviewedAt: returned.reviewedAt,
  });
  if (action === 'NONE') return action;

  const marker: Row = {
    id: markerId,
    updated_at: now,
    row_data: { deleted: true, restoreMarker: true, restoredFromTimecardId: returned.id },
  };
  const copied: Row[] =
    action === 'COPY_ROWS_AND_MARKER'
      ? [{ id: ROW, updated_at: now, row_data: { clockIn: '07:00', clockOut: returned.clockOut } }]
      : [];
  try {
    table.upsert([...copied, marker]);
  } catch {
    return 'WRITE_FAILED' as const;
  }
  return action;
}

const SUBMITTED_AT = '2026-10-05T16:00:00.000Z';
const RETURNED = { id: 'timecard-returned-1', reviewedAt: '2026-10-06T16:00:00.000Z', clockOut: '19:00' };

function tableAsSubmitted() {
  const table = new EditableRowsTable();
  // Row as the employee entered it before submitting.
  table.rows.set(ROW, { id: ROW, updated_at: SUBMITTED_AT, row_data: { clockIn: '07:00', clockOut: '19:00' } });
  return table;
}

describe('decideReturnedTimecardRestore', () => {
  it('writes nothing once the marker exists', () => {
    expect(
      decideReturnedTimecardRestore({ markerExists: true, latestSavedRowUpdatedAt: null, returnedReviewedAt: RETURNED.reviewedAt }),
    ).toBe('NONE');
  });

  it('records only the marker when rows changed after the return', () => {
    expect(
      decideReturnedTimecardRestore({
        markerExists: false,
        latestSavedRowUpdatedAt: '2026-10-07T00:00:00Z',
        returnedReviewedAt: RETURNED.reviewedAt,
      }),
    ).toBe('MARKER_ONLY');
  });

  it('copies rows only when nothing changed since the return', () => {
    expect(
      decideReturnedTimecardRestore({ markerExists: false, latestSavedRowUpdatedAt: SUBMITTED_AT, returnedReviewedAt: RETURNED.reviewedAt }),
    ).toBe('COPY_ROWS_AND_MARKER');
    expect(
      decideReturnedTimecardRestore({ markerExists: false, latestSavedRowUpdatedAt: undefined, returnedReviewedAt: RETURNED.reviewedAt }),
    ).toBe('COPY_ROWS_AND_MARKER');
  });
});

describe('returned timecard restore never overwrites employee corrections', () => {
  it('first open copies the returned rows and the marker in one write', () => {
    const table = tableAsSubmitted();
    expect(restore(table, RETURNED, '2026-10-07T08:00:00Z')).toBe('COPY_ROWS_AND_MARKER');
    expect(table.writes).toBe(1);
    expect(table.rows.has(getRestoreMarkerRowId(EMP, PERIOD, RETURNED.id))).toBe(true);
  });

  it('corrections survive reloads, navigation and previous-period selection', () => {
    const table = tableAsSubmitted();
    restore(table, RETURNED, '2026-10-07T08:00:00Z');
    employeeEdits(table, '2026-10-07T08:05:00Z', '19:45');

    // Every later visit (reload, switching periods, coming back) re-runs the check.
    for (let visit = 0; visit < 5; visit += 1) {
      expect(restore(table, RETURNED, `2026-10-07T09:0${visit}:00Z`)).toBe('NONE');
    }
    expect(table.rows.get(ROW)?.row_data.clockOut).toBe('19:45');
    expect(table.writes).toBe(2); // the restore and the employee's edit only
  });

  it('a deleted (cleared) row is not brought back by later visits', () => {
    const table = tableAsSubmitted();
    restore(table, RETURNED, '2026-10-07T08:00:00Z');
    table.upsert([{ id: ROW, updated_at: '2026-10-07T08:05:00Z', row_data: { deleted: true } }]);
    expect(restore(table, RETURNED, '2026-10-07T09:00:00Z')).toBe('NONE');
    expect(table.rows.get(ROW)?.row_data.deleted).toBe(true);
  });

  it('a second device left open since before the return cannot overwrite corrections made on the first', () => {
    const table = tableAsSubmitted();
    // Device A restores and the employee corrects the row there.
    restore(table, RETURNED, '2026-10-07T08:00:00Z');
    employeeEdits(table, '2026-10-07T08:05:00Z', '19:45');
    // Device B loaded the page before the return, slept, then wakes up. It
    // decides from a fresh read, so it sees the marker and writes nothing.
    expect(restore(table, RETURNED, '2026-10-07T12:00:00Z')).toBe('NONE');
    expect(table.rows.get(ROW)?.row_data.clockOut).toBe('19:45');
  });

  it('cards returned before this release keep in-progress corrections (no marker yet)', () => {
    const table = tableAsSubmitted();
    // Employee already corrected the row under the old code; no marker exists.
    employeeEdits(table, '2026-10-07T08:05:00Z', '19:45');
    expect(restore(table, RETURNED, '2026-10-08T08:00:00Z')).toBe('MARKER_ONLY');
    expect(table.rows.get(ROW)?.row_data.clockOut).toBe('19:45');
    // From then on the marker prevents any further write.
    expect(restore(table, RETURNED, '2026-10-08T09:00:00Z')).toBe('NONE');
  });

  it('a failed write saves nothing (rows and marker together), and the next visit restores correctly', () => {
    const table = tableAsSubmitted();
    table.failNextWrite = true;
    expect(restore(table, RETURNED, '2026-10-07T08:00:00Z')).toBe('WRITE_FAILED');
    expect(table.rows.has(getRestoreMarkerRowId(EMP, PERIOD, RETURNED.id))).toBe(false);
    expect(table.rows.get(ROW)?.updated_at).toBe(SUBMITTED_AT);
    expect(restore(table, RETURNED, '2026-10-07T08:10:00Z')).toBe('COPY_ROWS_AND_MARKER');
  });

  it('a later return of a newer version restores that version once, without overwriting newer corrections', () => {
    const table = tableAsSubmitted();
    restore(table, RETURNED, '2026-10-07T08:00:00Z');
    employeeEdits(table, '2026-10-07T08:05:00Z', '19:45');
    // Employee resubmits (rows locked), supervisor returns the resubmission.
    const secondReturn = { id: 'timecard-returned-2', reviewedAt: '2026-10-08T16:00:00.000Z', clockOut: '19:30' };
    expect(restore(table, secondReturn, '2026-10-09T08:00:00Z')).toBe('COPY_ROWS_AND_MARKER');
    expect(table.rows.get(ROW)?.row_data.clockOut).toBe('19:30');
    employeeEdits(table, '2026-10-09T08:05:00Z', '19:40');
    expect(restore(table, secondReturn, '2026-10-09T10:00:00Z')).toBe('NONE');
    expect(table.rows.get(ROW)?.row_data.clockOut).toBe('19:40');
  });

  it('documents the one remaining limit: device clocks for cards returned before the release', () => {
    // Only applies when no marker exists yet (cards returned before release).
    // If the employee's device clock was far behind the supervisor's, a real
    // correction can look older than the return.
    expect(savedRowsChangedAfterReturn('2026-10-06T15:00:00Z', '2026-10-06T16:00:00Z')).toBe(false);
  });
});

describe('database restore function helpers', () => {
  it('builds rows with the date taken from each visible row key', () => {
    expect(
      buildRestoreRpcRows(
        { [`${PREFIX}2026-10-06`]: { shiftLabel: 'R1' }, [`${PREFIX}2026-10-07-segment-2`]: { shiftLabel: 'P' } },
        PREFIX,
      ),
    ).toEqual([
      { id: `${PREFIX}2026-10-06`, date_key: '2026-10-06', row_data: { shiftLabel: 'R1' } },
      { id: `${PREFIX}2026-10-07-segment-2`, date_key: '2026-10-07', row_data: { shiftLabel: 'P' } },
    ]);
  });

  it('accepts only the three documented results', () => {
    ['RESTORED', 'MARKER_ONLY', 'ALREADY_RESTORED'].forEach((value) => expect(isRestoreRpcResult(value)).toBe(true));
    [null, undefined, '', 'restored', 42, {}].forEach((value) => expect(isRestoreRpcResult(value)).toBe(false));
  });

  it('falls back to direct writes only when the function is not installed', () => {
    expect(isMissingDatabaseFunctionError({ code: 'PGRST202' })).toBe(true);
    expect(isMissingDatabaseFunctionError({ code: '42883' })).toBe(true);
    // Permission, row-level security, validation and network errors are real failures.
    ['42501', '22023', '23505', 'PGRST301', '', undefined].forEach((code) =>
      expect(isMissingDatabaseFunctionError({ code })).toBe(false),
    );
    expect(isMissingDatabaseFunctionError(null)).toBe(false);
  });
});
