import { describe, expect, it } from 'vitest';
import {
  assignRestoredRowKeys,
  buildSupervisorTimecardQueues,
  checkTimecardSignature,
  compareTimecardRecency,
  evaluateEmployeeSubmission,
  getEditableRowPrefix,
  getEffectiveVersionNumber,
  getEmployeeSubmissionVersionFields,
  getEmployeeTimecardState,
  getExpectedSignatureName,
  getNextTimecardVersionNumber,
  getPayrollStatusForRecord,
  getRestoreMarkerRowId,
  getReturnedTimecardsForEmployee,
  isTimecardPeriodEditable,
  savedRowsChangedAfterReturn,
  selectCurrentTimecard,
  selectCurrentTimecards,
  shouldRestoreReturnedTimecard,
  signatureLetters,
  type TimecardVersionRecord,
} from './timecardWorkflow';

// Synthetic records only. No real employees, payroll or patient data.
const EMP = 'emp-test-001';
const PERIOD = '2026-pp-20';

function card(overrides: Partial<TimecardVersionRecord> & { id: string }): TimecardVersionRecord {
  return {
    employeeId: EMP,
    payPeriodKey: PERIOD,
    status: 'PENDING_SUPERVISOR_REVIEW',
    submittedAt: '2026-10-01T15:00:00.000Z',
    versionNumber: null,
    parentTimecardId: null,
    reviewedAt: null,
    submissionAcknowledgement: { submissionAction: 'SUBMITTED' },
    ...overrides,
  };
}

describe('getEffectiveVersionNumber', () => {
  it('treats missing, null, zero, negative and non-numeric versions as 1', () => {
    expect(getEffectiveVersionNumber({})).toBe(1);
    expect(getEffectiveVersionNumber({ versionNumber: null })).toBe(1);
    expect(getEffectiveVersionNumber({ versionNumber: 0 })).toBe(1);
    expect(getEffectiveVersionNumber({ versionNumber: -3 })).toBe(1);
    expect(getEffectiveVersionNumber({ versionNumber: Number.NaN })).toBe(1);
    expect(getEffectiveVersionNumber({ versionNumber: 4 })).toBe(4);
  });
});

describe('compareTimecardRecency', () => {
  it('orders by submission time, then version, then id', () => {
    const older = card({ id: 'a', submittedAt: '2026-10-01T10:00:00Z', versionNumber: 9 });
    const newer = card({ id: 'b', submittedAt: '2026-10-02T10:00:00Z', versionNumber: 1 });
    expect([older, newer].sort(compareTimecardRecency).map((r) => r.id)).toEqual(['b', 'a']);

    const sameTimeV1 = card({ id: 'c', versionNumber: 1 });
    const sameTimeV2 = card({ id: 'd', versionNumber: 2 });
    expect([sameTimeV1, sameTimeV2].sort(compareTimecardRecency).map((r) => r.id)).toEqual(['d', 'c']);

    const tieX = card({ id: 'x' });
    const tieY = card({ id: 'y' });
    expect([tieX, tieY].sort(compareTimecardRecency).map((r) => r.id)).toEqual(['y', 'x']);
    expect([tieY, tieX].sort(compareTimecardRecency).map((r) => r.id)).toEqual(['y', 'x']);
  });

  it('sorts unparseable submission times last', () => {
    const broken = card({ id: 'broken', submittedAt: 'not-a-date', versionNumber: 5 });
    const valid = card({ id: 'valid', submittedAt: '2020-01-01T00:00:00Z' });
    expect([broken, valid].sort(compareTimecardRecency)[0].id).toBe('valid');
  });
});

describe('selectCurrentTimecard', () => {
  it('returns null for no records', () => {
    expect(selectCurrentTimecard([])).toBeNull();
  });

  it('selects the newest record when no lineage exists (historical records)', () => {
    const records = [
      card({ id: 'v1', status: 'RETURNED', submittedAt: '2026-10-01T10:00:00Z' }),
      card({ id: 'resub', submittedAt: '2026-10-02T10:00:00Z' }),
    ];
    expect(selectCurrentTimecard(records)?.id).toBe('resub');
  });

  it('never selects a record that another record replaced, even if device clocks disagree', () => {
    const returned = card({ id: 'returned', status: 'RETURNED', submittedAt: '2026-10-05T10:00:00Z', versionNumber: 2 });
    // Employee device clock is behind: the resubmission looks older.
    const resubmission = card({
      id: 'resub',
      submittedAt: '2026-10-04T09:00:00Z',
      versionNumber: 3,
      parentTimecardId: 'returned',
    });
    expect(selectCurrentTimecard([returned, resubmission])?.id).toBe('resub');
  });

  it('is independent of input order', () => {
    const records = [
      card({ id: 'a', submittedAt: '2026-10-01T10:00:00Z' }),
      card({ id: 'b', submittedAt: '2026-10-03T10:00:00Z', parentTimecardId: 'a', versionNumber: 2 }),
      card({ id: 'c', submittedAt: '2026-10-02T10:00:00Z' }),
    ];
    const expected = selectCurrentTimecard(records)?.id;
    expect(selectCurrentTimecard([...records].reverse())?.id).toBe(expected);
    expect(selectCurrentTimecard([records[1], records[2], records[0]])?.id).toBe(expected);
  });

  it('falls back to all records if lineage forms a cycle (corrupt data)', () => {
    const records = [
      card({ id: 'a', parentTimecardId: 'b', submittedAt: '2026-10-01T10:00:00Z' }),
      card({ id: 'b', parentTimecardId: 'a', submittedAt: '2026-10-02T10:00:00Z' }),
    ];
    expect(selectCurrentTimecard(records)?.id).toBe('b');
  });

  it('ignores parent references to records outside the set', () => {
    const records = [card({ id: 'only', parentTimecardId: 'missing-parent' })];
    expect(selectCurrentTimecard(records)?.id).toBe('only');
  });
});

describe('selectCurrentTimecards', () => {
  it('returns one current record per employee and pay period', () => {
    const records = [
      card({ id: 'e1-p1-old', submittedAt: '2026-10-01T10:00:00Z', status: 'RETURNED' }),
      card({ id: 'e1-p1-new', submittedAt: '2026-10-02T10:00:00Z' }),
      card({ id: 'e1-p2', payPeriodKey: '2026-pp-21' }),
      card({ id: 'e2-p1', employeeId: 'emp-test-002' }),
    ];
    expect(selectCurrentTimecards(records).map((r) => r.id).sort()).toEqual(['e1-p1-new', 'e1-p2', 'e2-p1']);
  });
});

describe('getEmployeeTimecardState', () => {
  it('reports no record when nothing was submitted', () => {
    expect(getEmployeeTimecardState([], EMP, PERIOD)).toEqual({ current: null, lockedRecord: null, returnedRecord: null });
  });

  it('locks the employee while the current record is pending or approved', () => {
    const pending = getEmployeeTimecardState([card({ id: 'p' })], EMP, PERIOD);
    expect(pending.lockedRecord?.id).toBe('p');
    expect(pending.returnedRecord).toBeNull();

    const approved = getEmployeeTimecardState([card({ id: 'a', status: 'APPROVED' })], EMP, PERIOD);
    expect(approved.lockedRecord?.id).toBe('a');
  });

  it('exposes the returned record when the current record is returned', () => {
    const state = getEmployeeTimecardState([card({ id: 'r', status: 'RETURNED' })], EMP, PERIOD);
    expect(state.returnedRecord?.id).toBe('r');
    expect(state.lockedRecord).toBeNull();
  });

  it('ignores other employees and other pay periods', () => {
    const state = getEmployeeTimecardState(
      [card({ id: 'other-emp', employeeId: 'emp-x' }), card({ id: 'other-period', payPeriodKey: '2026-pp-1' })],
      EMP,
      PERIOD,
    );
    expect(state.current).toBeNull();
  });
});

describe('getReturnedTimecardsForEmployee', () => {
  it('lists every pay period whose current record is returned', () => {
    const records = [
      card({ id: 'p19-returned', payPeriodKey: '2026-pp-19', status: 'RETURNED' }),
      card({ id: 'p20-returned', status: 'RETURNED', submittedAt: '2026-10-01T10:00:00Z' }),
      card({ id: 'p20-resub', submittedAt: '2026-10-02T10:00:00Z', parentTimecardId: 'p20-returned' }),
      card({ id: 'other-employee', employeeId: 'emp-x', status: 'RETURNED' }),
    ];
    expect(getReturnedTimecardsForEmployee(records, EMP).map((r) => r.id)).toEqual(['p19-returned']);
  });
});

describe('isTimecardPeriodEditable', () => {
  it('allows editing a new card inside the normal two-period window only', () => {
    expect(isTimecardPeriodEditable({ isWithinEmployeeEditWindow: true, isPayrollFinalized: false, current: null })).toBe(true);
    expect(isTimecardPeriodEditable({ isWithinEmployeeEditWindow: false, isPayrollFinalized: false, current: null })).toBe(false);
  });

  it('locks pending and approved cards', () => {
    expect(
      isTimecardPeriodEditable({ isWithinEmployeeEditWindow: true, isPayrollFinalized: false, current: card({ id: 'p' }) }),
    ).toBe(false);
    expect(
      isTimecardPeriodEditable({
        isWithinEmployeeEditWindow: true,
        isPayrollFinalized: false,
        current: card({ id: 'a', status: 'APPROVED' }),
      }),
    ).toBe(false);
  });

  it('keeps a returned card editable even outside the normal window (no dead end)', () => {
    expect(
      isTimecardPeriodEditable({
        isWithinEmployeeEditWindow: false,
        isPayrollFinalized: false,
        current: card({ id: 'r', status: 'RETURNED' }),
      }),
    ).toBe(true);
  });

  it('locks every card in a finalized payroll period', () => {
    expect(
      isTimecardPeriodEditable({
        isWithinEmployeeEditWindow: true,
        isPayrollFinalized: true,
        current: card({ id: 'r', status: 'RETURNED' }),
      }),
    ).toBe(false);
    expect(isTimecardPeriodEditable({ isWithinEmployeeEditWindow: true, isPayrollFinalized: true, current: null })).toBe(false);
  });
});

describe('evaluateEmployeeSubmission', () => {
  const base = {
    hasEmployeeProfile: true,
    isSubmitting: false,
    isWithinEmployeeEditWindow: true,
    isPayrollFinalized: false,
    current: null,
  };

  it('allows a first submission and a resubmission of a returned card', () => {
    expect(evaluateEmployeeSubmission(base)).toEqual({ allowed: true, isResubmission: false });
    expect(evaluateEmployeeSubmission({ ...base, current: card({ id: 'r', status: 'RETURNED' }) })).toEqual({
      allowed: true,
      isResubmission: true,
    });
  });

  it.each([
    [{ hasEmployeeProfile: false }, 'NO_EMPLOYEE_PROFILE'],
    [{ isSubmitting: true }, 'SUBMISSION_IN_PROGRESS'],
    [{ current: card({ id: 'p' }) }, 'ALREADY_SUBMITTED'],
    [{ current: card({ id: 'a', status: 'APPROVED' }) }, 'ALREADY_APPROVED'],
    [{ isPayrollFinalized: true }, 'PAYROLL_FINALIZED'],
    [{ isWithinEmployeeEditWindow: false }, 'PERIOD_CLOSED'],
  ] as const)('blocks with a clear reason: %o -> %s', (overrides, reason) => {
    const result = evaluateEmployeeSubmission({ ...base, ...overrides });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe(reason);
      expect(result.message.length).toBeGreaterThan(10);
    }
  });

  it('tells the employee how to resolve a finalized payroll period', () => {
    const result = evaluateEmployeeSubmission({
      ...base,
      isPayrollFinalized: true,
      current: card({ id: 'r', status: 'RETURNED' }),
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.message).toMatch(/reopen payroll/i);
  });
});

describe('version lineage', () => {
  it('starts at version 1 and increments past the highest existing version', () => {
    expect(getNextTimecardVersionNumber([])).toBe(1);
    expect(getNextTimecardVersionNumber([card({ id: 'legacy' })])).toBe(2);
    expect(getNextTimecardVersionNumber([card({ id: 'a', versionNumber: 2 }), card({ id: 'b' })])).toBe(3);
  });

  it('records a first submission without a parent', () => {
    expect(getEmployeeSubmissionVersionFields([], EMP)).toEqual({
      versionNumber: 1,
      parentTimecardId: null,
      versionReason: 'EMPLOYEE_SUBMISSION',
      createdByRole: 'EMPLOYEE',
      createdByEmployeeId: EMP,
      submissionAction: 'SUBMITTED',
    });
  });

  it('links a resubmission to the returned record it replaces', () => {
    const fields = getEmployeeSubmissionVersionFields(
      [card({ id: 'v1' }), card({ id: 'v2', status: 'RETURNED', versionNumber: 2, parentTimecardId: 'v1', submittedAt: '2026-10-02T00:00:00Z' })],
      EMP,
    );
    expect(fields).toMatchObject({
      versionNumber: 3,
      parentTimecardId: 'v2',
      versionReason: 'EMPLOYEE_RESUBMISSION',
      submissionAction: 'RESUBMITTED',
    });
  });
});

describe('buildSupervisorTimecardQueues', () => {
  it('places each employee in exactly one queue based on the current record', () => {
    const records = [
      card({ id: 'pending', employeeId: 'e-pending' }),
      card({
        id: 'resubmitted',
        employeeId: 'e-resub',
        submissionAcknowledgement: { submissionAction: 'RESUBMITTED' },
      }),
      card({ id: 'returned', employeeId: 'e-returned', status: 'RETURNED' }),
      card({ id: 'approved', employeeId: 'e-approved', status: 'APPROVED' }),
    ];
    const queues = buildSupervisorTimecardQueues(records);
    expect(queues.pendingReview.map((r) => r.id)).toEqual(['pending']);
    expect(queues.resubmitted.map((r) => r.id)).toEqual(['resubmitted']);
    expect(queues.awaitingEmployeeResubmission.map((r) => r.id)).toEqual(['returned']);
    expect(queues.approvedForPayroll.map((r) => r.id)).toEqual(['approved']);
    expect(queues.supersededApprovals).toEqual([]);
  });

  it('shows a historical (version-less) resubmission made after a supervisor-edited version was returned', () => {
    // The exact production deadlock: v2 (supervisor edit) was returned; the
    // employee resubmitted before lineage was recorded (no version number).
    const records = [
      card({ id: 'v1', submittedAt: '2026-10-01T10:00:00Z' }),
      card({ id: 'v2-edit', versionNumber: 2, parentTimecardId: 'v1', status: 'RETURNED', submittedAt: '2026-10-01T12:00:00Z' }),
      card({
        id: 'legacy-resub',
        submittedAt: '2026-10-02T10:00:00Z',
        submissionAcknowledgement: { submissionAction: 'RESUBMITTED' },
      }),
    ];
    const queues = buildSupervisorTimecardQueues(records);
    expect(queues.resubmitted.map((r) => r.id)).toEqual(['legacy-resub']);
    expect(queues.awaitingEmployeeResubmission).toEqual([]);
    expect(getEmployeeTimecardState(records, EMP, PERIOD).current?.id).toBe('legacy-resub');
  });

  it('puts exactly one record per employee in the approved packet', () => {
    const records = [
      card({ id: 'old-approved', status: 'APPROVED', submittedAt: '2026-10-01T10:00:00Z' }),
      card({ id: 'new-approved', status: 'APPROVED', submittedAt: '2026-10-03T10:00:00Z', versionNumber: 2, parentTimecardId: 'old-approved' }),
    ];
    expect(buildSupervisorTimecardQueues(records).approvedForPayroll.map((r) => r.id)).toEqual(['new-approved']);
  });

  it('keeps an outdated approval out of the packet while a newer version is pending', () => {
    const records = [
      card({ id: 'approved-v1', status: 'APPROVED', submittedAt: '2026-10-01T10:00:00Z' }),
      card({ id: 'pending-v2', versionNumber: 2, parentTimecardId: 'approved-v1', submittedAt: '2026-10-03T10:00:00Z' }),
    ];
    const queues = buildSupervisorTimecardQueues(records);
    expect(queues.approvedForPayroll).toEqual([]);
    expect(queues.pendingReview.map((r) => r.id)).toEqual(['pending-v2']);
    expect(queues.supersededApprovals).toHaveLength(1);
    expect(queues.supersededApprovals[0].approved.id).toBe('approved-v1');
    expect(queues.supersededApprovals[0].current.id).toBe('pending-v2');
  });

  it('agrees with the employee view for every employee', () => {
    const records = [
      card({ id: 'a1', employeeId: 'a', status: 'RETURNED', submittedAt: '2026-10-01T10:00:00Z' }),
      card({ id: 'a2', employeeId: 'a', submittedAt: '2026-10-02T10:00:00Z', parentTimecardId: 'a1', versionNumber: 2 }),
      card({ id: 'b1', employeeId: 'b', status: 'APPROVED' }),
    ];
    const queues = buildSupervisorTimecardQueues(records);
    ['a', 'b'].forEach((employeeId) => {
      expect(queues.currentByEmployeeId.get(employeeId)?.id).toBe(
        getEmployeeTimecardState(records, employeeId, PERIOD).current?.id,
      );
    });
  });
});

describe('getPayrollStatusForRecord', () => {
  it('maps record status to payroll status', () => {
    expect(getPayrollStatusForRecord(null)).toBe('NOT_SUBMITTED');
    expect(getPayrollStatusForRecord(card({ id: 'p' }))).toBe('PENDING_REVIEW');
    expect(getPayrollStatusForRecord(card({ id: 'r', status: 'RETURNED' }))).toBe('PENDING_RESUBMISSION');
    expect(getPayrollStatusForRecord(card({ id: 'a', status: 'APPROVED' }))).toBe('APPROVED');
  });
});

describe('electronic signature', () => {
  const profile = { firstName: 'Carla', lastName: 'Ruiz-Peña', name: 'Ruiz-Peña, Carla' };

  it('reduces names to letters without accents, case, spaces or punctuation', () => {
    expect(signatureLetters("  José  O'Neil-Peña Jr. ")).toBe('joseoneilpenajr');
  });

  it.each([
    'Carla Ruiz-Peña',
    'carla ruiz-peña',
    'Carla Ruiz Pena',
    'CARLA RUIZPENA',
    '  Carla   Ruiz-Pena  ',
    'Ruiz-Peña, Carla',
    'ruiz pena, carla',
  ])('accepts the employee\'s own name: %s', (typed) => {
    const result = checkTimecardSignature(typed, profile);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.matchedProfileName).toBe('Carla Ruiz-Peña');
      expect(result.method).toBe('PROFILE_NAME_LETTERS_V2');
    }
  });

  it.each([
    ['Carla', 'MISMATCH'],
    ['Ruiz-Peña', 'MISMATCH'],
    ['C. Ruiz-Peña', 'MISMATCH'],
    ['Carla Ruiz', 'MISMATCH'],
    ['Ruiz-Peña Carla', 'MISMATCH'],
    ['Carla Maria Ruiz-Peña', 'MISMATCH'],
    ['Carlos Ruiz-Peña', 'MISMATCH'],
    ['Another Employee', 'MISMATCH'],
    ['', 'EMPTY'],
    ['   ', 'EMPTY'],
    ['-- , --', 'EMPTY'],
  ])('rejects %j with reason %s and an explanation', (typed, reason) => {
    const result = checkTimecardSignature(typed, profile);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe(reason);
      expect(result.message).toContain('Carla Ruiz-Peña');
    }
  });

  it('never accepts an employee ID or placeholder when the profile is missing a name', () => {
    const idOnly = { firstName: '', lastName: '', name: 'emp-test-009' };
    const result = checkTimecardSignature('emp-test-009', idOnly);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('NO_PROFILE_NAME');

    expect(checkTimecardSignature('Unnamed Employee', { name: 'Unnamed Employee' }).valid).toBe(false);
    expect(checkTimecardSignature('Carla', { firstName: 'Carla', lastName: '', name: 'Carla' }).valid).toBe(false);
    expect(checkTimecardSignature('anything', null).valid).toBe(false);
  });

  it('uses the "Last, First" display name when the separate fields are missing', () => {
    const displayOnly = { name: 'Nguyen, Anh' };
    expect(checkTimecardSignature('Anh Nguyen', displayOnly).valid).toBe(true);
    expect(getExpectedSignatureName(displayOnly)).toBe('Anh Nguyen');
  });
});

describe('restoring a returned timecard', () => {
  const prefix = getEditableRowPrefix(EMP, PERIOD);

  it('keeps visible base and segment keys unchanged', () => {
    const keys = assignRestoredRowKeys(
      [
        { groupKey: `${prefix}2026-10-04`, dateKey: '2026-10-04' },
        { groupKey: `${prefix}2026-10-04-segment-1`, dateKey: '2026-10-04' },
      ],
      prefix,
    );
    expect(keys.get(`${prefix}2026-10-04`)).toBe(`${prefix}2026-10-04`);
    expect(keys.get(`${prefix}2026-10-04-segment-1`)).toBe(`${prefix}2026-10-04-segment-1`);
  });

  it('moves non-standard keys to a visible base or next free segment row', () => {
    const keys = assignRestoredRowKeys(
      [
        { groupKey: `${prefix}2026-10-04`, dateKey: '2026-10-04' },
        { groupKey: 'live-clock-punch-abc', dateKey: '2026-10-04' },
        { groupKey: 'emp-test-001-2026-pp-19-2026-10-05', dateKey: '2026-10-05' },
        { groupKey: 'another-odd-key', dateKey: '2026-10-05' },
      ],
      prefix,
    );
    expect(keys.get('live-clock-punch-abc')).toBe(`${prefix}2026-10-04-segment-1`);
    expect(keys.get('emp-test-001-2026-pp-19-2026-10-05')).toBe(`${prefix}2026-10-05`);
    expect(keys.get('another-odd-key')).toBe(`${prefix}2026-10-05-segment-1`);
    // Every assigned key is unique and visible.
    const values = [...keys.values()];
    expect(new Set(values).size).toBe(values.length);
    values.forEach((value) => expect(value).toMatch(new RegExp(`^${prefix}\\d{4}-\\d{2}-\\d{2}(-segment-\\d+)?$`)));
  });

  it('never assigns a segment number already in use', () => {
    const keys = assignRestoredRowKeys(
      [
        { groupKey: `${prefix}2026-10-04`, dateKey: '2026-10-04' },
        { groupKey: `${prefix}2026-10-04-segment-2`, dateKey: '2026-10-04' },
        { groupKey: 'odd', dateKey: '2026-10-04' },
      ],
      prefix,
    );
    expect(keys.get('odd')).toBe(`${prefix}2026-10-04-segment-3`);
  });

  it('restores exactly once, and only after saved rows have loaded', () => {
    const base = {
      returnedTimecardId: 'returned-1',
      isPeriodEditable: true,
      periodRowsLoaded: true,
      restoredTimecardIds: new Set<string>(),
    };
    expect(shouldRestoreReturnedTimecard(base)).toBe(true);
    expect(shouldRestoreReturnedTimecard({ ...base, periodRowsLoaded: false })).toBe(false);
    expect(shouldRestoreReturnedTimecard({ ...base, restoredTimecardIds: new Set(['returned-1']) })).toBe(false);
    expect(shouldRestoreReturnedTimecard({ ...base, isPeriodEditable: false })).toBe(false);
    expect(shouldRestoreReturnedTimecard({ ...base, returnedTimecardId: null })).toBe(false);
    // A later, different return of the same period restores again.
    expect(shouldRestoreReturnedTimecard({ ...base, returnedTimecardId: 'returned-2', restoredTimecardIds: new Set(['returned-1']) })).toBe(true);
  });

  it('does not overwrite rows saved after the return (cards returned before this fix)', () => {
    expect(savedRowsChangedAfterReturn('2026-10-03T10:00:00Z', '2026-10-02T10:00:00Z')).toBe(true);
    expect(savedRowsChangedAfterReturn('2026-10-01T10:00:00Z', '2026-10-02T10:00:00Z')).toBe(false);
    expect(savedRowsChangedAfterReturn(undefined, '2026-10-02T10:00:00Z')).toBe(false);
    expect(savedRowsChangedAfterReturn('2026-10-03T10:00:00Z', null)).toBe(false);
  });

  it('uses a marker id that can never be mistaken for a visible row', () => {
    const marker = getRestoreMarkerRowId(EMP, PERIOD, 'timecard-abc');
    expect(marker.startsWith(prefix)).toBe(true);
    expect(marker).not.toMatch(new RegExp(`^${prefix}\\d{4}-\\d{2}-\\d{2}`));
  });
});
