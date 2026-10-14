import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSupervisorTimecardQueues,
  evaluateEmployeeSubmission,
  getEmployeeSubmissionVersionFields,
  getEmployeeTimecardState,
  getNextTimecardVersionNumber,
  getPayrollStatusForRecord,
  type TimecardStatus,
  type TimecardVersionRecord,
} from './timecardWorkflow';

// End-to-end workflow simulation on an in-memory store with synthetic data.
// The store mirrors how the pages write submitted_timecards:
//   - employee submissions and supervisor corrections INSERT new rows;
//   - supervisor approve/return UPDATE the status of the reviewed row;
//   - nothing is ever deleted.
// Finalized payroll mirrors payroll_submissions and the supervisor screen's
// finalize/reopen guards.

type StoredRecord = TimecardVersionRecord & { totalHours: number; versionReason: string; supervisorComment?: string };

class TimecardStore {
  records: StoredRecord[] = [];
  finalizedPeriods = new Set<string>();
  private clock = Date.parse('2026-10-01T08:00:00.000Z');
  private sequence = 0;

  /** Every action happens one minute after the previous one. */
  now(): string {
    this.clock += 60_000;
    return new Date(this.clock).toISOString();
  }

  /** Simulates a device whose clock is wrong by `offsetMinutes`. */
  skewedNow(offsetMinutes: number): string {
    return new Date(Date.parse(this.now()) + offsetMinutes * 60_000).toISOString();
  }

  periodRecords(employeeId: string, payPeriodKey: string) {
    return this.records.filter((r) => r.employeeId === employeeId && r.payPeriodKey === payPeriodKey);
  }

  employeeView(employeeId: string, payPeriodKey: string) {
    return getEmployeeTimecardState(this.records, employeeId, payPeriodKey);
  }

  supervisorQueues(payPeriodKey: string) {
    return buildSupervisorTimecardQueues(this.records.filter((r) => r.payPeriodKey === payPeriodKey));
  }

  /** Employee dashboard submitTimecardForReview. */
  employeeSubmit(employeeId: string, payPeriodKey: string, totalHours: number, options: { clockOffsetMinutes?: number } = {}) {
    const periodRecords = this.periodRecords(employeeId, payPeriodKey);
    const eligibility = evaluateEmployeeSubmission({
      hasEmployeeProfile: true,
      isSubmitting: false,
      isWithinEmployeeEditWindow: true,
      isPayrollFinalized: this.finalizedPeriods.has(payPeriodKey),
      current: this.employeeView(employeeId, payPeriodKey).current,
    });
    if (!eligibility.allowed) return eligibility;

    const fields = getEmployeeSubmissionVersionFields(periodRecords, employeeId);
    const record: StoredRecord = {
      id: `synthetic-${employeeId}-${payPeriodKey}-${++this.sequence}`,
      employeeId,
      payPeriodKey,
      status: 'PENDING_SUPERVISOR_REVIEW',
      submittedAt: options.clockOffsetMinutes ? this.skewedNow(options.clockOffsetMinutes) : this.now(),
      versionNumber: fields.versionNumber,
      parentTimecardId: fields.parentTimecardId,
      versionReason: fields.versionReason,
      submissionAcknowledgement: { submissionAction: fields.submissionAction },
      totalHours,
    };
    this.records.push(record);
    return { allowed: true as const, record };
  }

  /** A row written by the pre-fix employee code: no lineage at all. */
  legacyEmployeeResubmit(employeeId: string, payPeriodKey: string, totalHours: number) {
    const record: StoredRecord = {
      id: `legacy-${++this.sequence}`,
      employeeId,
      payPeriodKey,
      status: 'PENDING_SUPERVISOR_REVIEW',
      submittedAt: this.now(),
      versionNumber: null,
      parentTimecardId: null,
      versionReason: '',
      submissionAcknowledgement: { submissionAction: 'RESUBMITTED' },
      totalHours,
    };
    this.records.push(record);
    return record;
  }

  private review(recordId: string, status: TimecardStatus, comment = '') {
    const record = this.records.find((r) => r.id === recordId);
    if (!record) throw new Error(`unknown record ${recordId}`);
    if (this.finalizedPeriods.has(record.payPeriodKey)) {
      return { ok: false as const, reason: 'PAYROLL_LOCKED' };
    }
    record.status = status;
    record.reviewedAt = this.now();
    record.supervisorComment = comment;
    return { ok: true as const };
  }

  supervisorReturn(recordId: string, comment: string) {
    return this.review(recordId, 'RETURNED', comment);
  }

  supervisorApprove(recordId: string) {
    return this.review(recordId, 'APPROVED');
  }

  /** Supervisor saveSupervisorTimecardEdit: inserts a corrected version. */
  supervisorEdit(recordId: string, totalHours: number) {
    const original = this.records.find((r) => r.id === recordId);
    if (!original) throw new Error(`unknown record ${recordId}`);
    if (this.finalizedPeriods.has(original.payPeriodKey)) return { ok: false as const, reason: 'PAYROLL_LOCKED' };
    const corrected: StoredRecord = {
      ...original,
      id: `synthetic-edit-${++this.sequence}`,
      versionNumber: getNextTimecardVersionNumber(this.periodRecords(original.employeeId, original.payPeriodKey)),
      parentTimecardId: original.id,
      versionReason: 'SUPERVISOR_COMPENSATION_CORRECTION',
      status: 'PENDING_SUPERVISOR_REVIEW',
      submittedAt: this.now(),
      reviewedAt: null,
      totalHours,
    };
    this.records.push(corrected);
    return { ok: true as const, record: corrected };
  }

  /** Supervisor finalize-payroll guard (submitPayroll). */
  finalizePayroll(payPeriodKey: string) {
    const queues = this.supervisorQueues(payPeriodKey);
    if (queues.pendingReview.length > 0 || queues.resubmitted.length > 0) return { ok: false as const, reason: 'PENDING_REVIEW' };
    if (queues.awaitingEmployeeResubmission.length > 0) return { ok: false as const, reason: 'PENDING_RESUBMISSION' };
    if (queues.approvedForPayroll.length === 0) return { ok: false as const, reason: 'NOTHING_APPROVED' };
    this.finalizedPeriods.add(payPeriodKey);
    return { ok: true as const, approvedCount: queues.approvedForPayroll.length };
  }

  reopenPayroll(payPeriodKey: string) {
    this.finalizedPeriods.delete(payPeriodKey);
  }

  approvedPacketHours(payPeriodKey: string) {
    return this.supervisorQueues(payPeriodKey).approvedForPayroll.reduce(
      (sum, record) => sum + (record as StoredRecord).totalHours,
      0,
    );
  }
}

const P = '2026-pp-20';
const E = 'emp-synthetic-001';

/** Both screens must always agree on the current record. */
function expectScreensAgree(store: TimecardStore, employeeId = E, payPeriodKey = P) {
  const employeeCurrent = store.employeeView(employeeId, payPeriodKey).current;
  const supervisorCurrent = store.supervisorQueues(payPeriodKey).currentByEmployeeId.get(employeeId) ?? null;
  expect(supervisorCurrent?.id).toBe(employeeCurrent?.id);
  return employeeCurrent;
}

function queueOf(store: TimecardStore, recordId: string, payPeriodKey = P) {
  const queues = store.supervisorQueues(payPeriodKey);
  const names = (['pendingReview', 'resubmitted', 'awaitingEmployeeResubmission', 'approvedForPayroll'] as const).filter(
    (name) => queues[name].some((record) => record.id === recordId),
  );
  return names;
}

describe('complete timecard lifecycle', () => {
  let store: TimecardStore;

  beforeEach(() => {
    store = new TimecardStore();
  });

  it('submit -> return -> correct -> resubmit -> approve', () => {
    const first = store.employeeSubmit(E, P, 80);
    expect(first.allowed).toBe(true);
    if (!first.allowed) return;
    expect(queueOf(store, first.record.id)).toEqual(['pendingReview']);
    expect(store.employeeView(E, P).lockedRecord?.id).toBe(first.record.id);

    store.supervisorReturn(first.record.id, 'Missing clock-out on Tuesday');
    expect(queueOf(store, first.record.id)).toEqual(['awaitingEmployeeResubmission']);
    expect(store.employeeView(E, P).returnedRecord?.id).toBe(first.record.id);
    expectScreensAgree(store);

    const resubmission = store.employeeSubmit(E, P, 84);
    expect(resubmission.allowed).toBe(true);
    if (!resubmission.allowed) return;
    expect(resubmission.record).toMatchObject({ versionNumber: 2, parentTimecardId: first.record.id });
    expect(queueOf(store, resubmission.record.id)).toEqual(['resubmitted']);
    expect(store.supervisorQueues(P).awaitingEmployeeResubmission).toEqual([]);
    expectScreensAgree(store);

    store.supervisorApprove(resubmission.record.id);
    expect(queueOf(store, resubmission.record.id)).toEqual(['approvedForPayroll']);
    expect(store.approvedPacketHours(P)).toBe(84);
    expect(getPayrollStatusForRecord(expectScreensAgree(store))).toBe('APPROVED');
  });

  it('supports repeated returns and resubmissions with increasing versions', () => {
    let current = store.employeeSubmit(E, P, 70);
    for (let round = 1; round <= 4; round += 1) {
      if (!current.allowed) throw new Error('submission blocked');
      store.supervisorReturn(current.record.id, `Correction round ${round}`);
      const previousId = current.record.id;
      current = store.employeeSubmit(E, P, 70 + round);
      if (!current.allowed) throw new Error('resubmission blocked');
      expect(current.record.versionNumber).toBe(round + 1);
      expect(current.record.parentTimecardId).toBe(previousId);
      expect(queueOf(store, current.record.id)).toEqual(['resubmitted']);
      expectScreensAgree(store);
    }
    if (!current.allowed) return;
    store.supervisorApprove(current.record.id);
    expect(store.supervisorQueues(P).approvedForPayroll.map((r) => r.id)).toEqual([current.record.id]);
    expect(store.approvedPacketHours(P)).toBe(74);
    expect(store.records).toHaveLength(5);
  });

  it('supervisor edit -> return -> employee resubmits: the resubmission reaches the supervisor (regression)', () => {
    const first = store.employeeSubmit(E, P, 80);
    if (!first.allowed) throw new Error('blocked');
    const edit = store.supervisorEdit(first.record.id, 78);
    if (!edit.ok) throw new Error('edit blocked');
    expect(edit.record.versionNumber).toBe(2);
    expect(queueOf(store, first.record.id)).toEqual([]);
    expect(queueOf(store, edit.record.id)).toEqual(['pendingReview']);
    expectScreensAgree(store);

    store.supervisorReturn(edit.record.id, 'Please confirm the corrected hours');
    expect(store.employeeView(E, P).returnedRecord?.id).toBe(edit.record.id);

    const resubmission = store.employeeSubmit(E, P, 79);
    if (!resubmission.allowed) throw new Error('blocked');
    expect(resubmission.record).toMatchObject({ versionNumber: 3, parentTimecardId: edit.record.id });
    expect(queueOf(store, resubmission.record.id)).toEqual(['resubmitted']);
    expect(store.supervisorQueues(P).awaitingEmployeeResubmission).toEqual([]);
    expectScreensAgree(store);

    store.supervisorApprove(resubmission.record.id);
    expect(store.approvedPacketHours(P)).toBe(79);
  });

  it('a timecard already stuck in production becomes reviewable without any data changes', () => {
    const first = store.employeeSubmit(E, P, 80);
    if (!first.allowed) throw new Error('blocked');
    const edit = store.supervisorEdit(first.record.id, 78);
    if (!edit.ok) throw new Error('blocked');
    store.supervisorReturn(edit.record.id, 'Please confirm');
    // Written by the old employee code: no version, no parent.
    const legacy = store.legacyEmployeeResubmit(E, P, 79);

    expect(queueOf(store, legacy.id)).toEqual(['resubmitted']);
    expectScreensAgree(store);
    store.supervisorApprove(legacy.id);
    expect(store.supervisorQueues(P).approvedForPayroll.map((r) => r.id)).toEqual([legacy.id]);
  });

  it('a resubmission from a device with a slow clock is still current', () => {
    const first = store.employeeSubmit(E, P, 80);
    if (!first.allowed) throw new Error('blocked');
    store.supervisorReturn(first.record.id, 'Fix Friday');
    const resubmission = store.employeeSubmit(E, P, 82, { clockOffsetMinutes: -24 * 60 });
    if (!resubmission.allowed) throw new Error('blocked');
    expect(Date.parse(resubmission.record.submittedAt)).toBeLessThan(Date.parse(first.record.submittedAt));
    expect(expectScreensAgree(store)?.id).toBe(resubmission.record.id);
    expect(queueOf(store, resubmission.record.id)).toEqual(['resubmitted']);
  });

  it('blocks duplicate submissions while a card is pending or approved', () => {
    const first = store.employeeSubmit(E, P, 80);
    if (!first.allowed) throw new Error('blocked');
    const duplicate = store.employeeSubmit(E, P, 80);
    expect(duplicate).toMatchObject({ allowed: false, reason: 'ALREADY_SUBMITTED' });

    store.supervisorApprove(first.record.id);
    expect(store.employeeSubmit(E, P, 80)).toMatchObject({ allowed: false, reason: 'ALREADY_APPROVED' });
    expect(store.records).toHaveLength(1);
  });

  it('keeps a superseded approval out of the packet until the newer version is approved', () => {
    // Historical data: an approved record later superseded by a corrected
    // version that is still pending review.
    const first = store.employeeSubmit(E, P, 80);
    if (!first.allowed) throw new Error('blocked');
    store.supervisorApprove(first.record.id);
    const correction: StoredRecord = {
      ...(store.records[0] as StoredRecord),
      id: 'historical-correction',
      status: 'PENDING_SUPERVISOR_REVIEW',
      versionNumber: 2,
      parentTimecardId: first.record.id,
      submittedAt: store.now(),
      totalHours: 76,
    };
    store.records.push(correction);

    const queues = store.supervisorQueues(P);
    expect(queues.approvedForPayroll).toEqual([]);
    expect(queues.pendingReview.map((r) => r.id)).toEqual(['historical-correction']);
    expect(queues.supersededApprovals.map((s) => s.approved.id)).toEqual([first.record.id]);
    expect(store.finalizePayroll(P)).toMatchObject({ ok: false, reason: 'PENDING_REVIEW' });

    store.supervisorApprove('historical-correction');
    expect(store.supervisorQueues(P).approvedForPayroll.map((r) => r.id)).toEqual(['historical-correction']);
    expect(store.approvedPacketHours(P)).toBe(76);
  });

  it('never deletes or rewrites history: every version stays in the audit trail', () => {
    const first = store.employeeSubmit(E, P, 80);
    if (!first.allowed) throw new Error('blocked');
    const snapshotOfFirst = { ...first.record };
    store.supervisorReturn(first.record.id, 'Fix it');
    const second = store.employeeSubmit(E, P, 81);
    if (!second.allowed) throw new Error('blocked');
    const edit = store.supervisorEdit(second.record.id, 82);
    if (!edit.ok) throw new Error('blocked');
    store.supervisorApprove(edit.record.id);

    expect(store.records.map((r) => r.id)).toEqual([first.record.id, second.record.id, edit.record.id]);
    // Only review fields of the reviewed row changed; submission data is intact.
    const firstNow = store.records[0];
    expect(firstNow.totalHours).toBe(snapshotOfFirst.totalHours);
    expect(firstNow.submittedAt).toBe(snapshotOfFirst.submittedAt);
    expect(firstNow.versionNumber).toBe(snapshotOfFirst.versionNumber);
    expect(firstNow.status).toBe('RETURNED');
    expect(new Set(store.records.map((r) => r.versionNumber)).size).toBe(3);
  });
});

describe('finalized payroll periods', () => {
  let store: TimecardStore;

  beforeEach(() => {
    store = new TimecardStore();
  });

  it('cannot be finalized while any current record is pending, resubmitted or returned', () => {
    const a = store.employeeSubmit('emp-a', P, 80);
    const b = store.employeeSubmit('emp-b', P, 80);
    if (!a.allowed || !b.allowed) throw new Error('blocked');
    expect(store.finalizePayroll(P)).toMatchObject({ ok: false, reason: 'PENDING_REVIEW' });

    store.supervisorApprove(a.record.id);
    store.supervisorReturn(b.record.id, 'Fix');
    expect(store.finalizePayroll(P)).toMatchObject({ ok: false, reason: 'PENDING_RESUBMISSION' });

    const resubmission = store.employeeSubmit('emp-b', P, 81);
    if (!resubmission.allowed) throw new Error('blocked');
    expect(store.finalizePayroll(P)).toMatchObject({ ok: false, reason: 'PENDING_REVIEW' });

    store.supervisorApprove(resubmission.record.id);
    expect(store.finalizePayroll(P)).toEqual({ ok: true, approvedCount: 2 });
    expect(store.approvedPacketHours(P)).toBe(161);
  });

  it('blocks employee and supervisor changes once finalized, and the reopen process restores them', () => {
    const first = store.employeeSubmit(E, P, 80);
    if (!first.allowed) throw new Error('blocked');
    store.supervisorApprove(first.record.id);
    expect(store.finalizePayroll(P).ok).toBe(true);

    // Supervisor actions are locked.
    expect(store.supervisorEdit(first.record.id, 70)).toMatchObject({ ok: false, reason: 'PAYROLL_LOCKED' });
    expect(store.supervisorReturn(first.record.id, 'late fix')).toMatchObject({ ok: false, reason: 'PAYROLL_LOCKED' });

    // A late employee (no card yet) is told to contact a supervisor.
    const late = store.employeeSubmit('emp-late', P, 40);
    expect(late).toMatchObject({ allowed: false, reason: 'PAYROLL_FINALIZED' });
    if (!late.allowed) expect(late.message).toMatch(/reopen payroll/i);

    // Controlled correction path: supervisor reopens payroll.
    store.reopenPayroll(P);
    const lateNow = store.employeeSubmit('emp-late', P, 40);
    expect(lateNow.allowed).toBe(true);
    expect(store.supervisorReturn(first.record.id, 'Correction after reopen').ok).toBe(true);
    const corrected = store.employeeSubmit(E, P, 79);
    expect(corrected.allowed).toBe(true);
    if (corrected.allowed) expect(corrected.record.parentTimecardId).toBe(first.record.id);
  });

  it('a returned card is never stranded: reopening payroll always restores the resubmission path', () => {
    const first = store.employeeSubmit(E, P, 80);
    if (!first.allowed) throw new Error('blocked');
    store.supervisorReturn(first.record.id, 'Fix');
    // Legacy situation: a period finalized while a card was returned.
    store.finalizedPeriods.add(P);
    expect(store.employeeSubmit(E, P, 81)).toMatchObject({ allowed: false, reason: 'PAYROLL_FINALIZED' });
    store.reopenPayroll(P);
    expect(store.employeeSubmit(E, P, 81).allowed).toBe(true);
  });
});

describe('multiple employees and periods', () => {
  it('keeps every employee and pay period independent', () => {
    const store = new TimecardStore();
    const periods = ['2026-pp-19', '2026-pp-20'];
    const employees = ['emp-a', 'emp-b', 'emp-c'];
    periods.forEach((period) => {
      employees.forEach((employee, index) => {
        const submitted = store.employeeSubmit(employee, period, 60 + index);
        if (!submitted.allowed) throw new Error('blocked');
        if (index === 0) store.supervisorApprove(submitted.record.id);
        if (index === 1) {
          store.supervisorReturn(submitted.record.id, 'Fix');
          const again = store.employeeSubmit(employee, period, 70);
          if (!again.allowed) throw new Error('blocked');
        }
      });
    });

    periods.forEach((period) => {
      const queues = store.supervisorQueues(period);
      expect(queues.approvedForPayroll.map((r) => r.employeeId)).toEqual(['emp-a']);
      expect(queues.resubmitted.map((r) => r.employeeId)).toEqual(['emp-b']);
      expect(queues.pendingReview.map((r) => r.employeeId)).toEqual(['emp-c']);
      employees.forEach((employee) => expectScreensAgree(store, employee, period));
    });
  });
});

describe('payroll totals and historical approvals (randomized workflows)', () => {
  // Deterministic pseudo-random generator so failures are reproducible.
  function seededRandom(seed: number) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 2 ** 32;
    };
  }

  it('holds every payroll invariant across 300 random workflows', () => {
    const employees = ['emp-r1', 'emp-r2', 'emp-r3', 'emp-r4'];

    for (let seed = 1; seed <= 300; seed += 1) {
      const random = seededRandom(seed);
      const store = new TimecardStore();
      const createdSnapshots = new Map<string, { submittedAt: string; totalHours: number; versionNumber: number | null | undefined }>();
      const everApproved = new Set<string>();

      for (let step = 0; step < 40; step += 1) {
        const employeeId = employees[Math.floor(random() * employees.length)];
        const current = store.employeeView(employeeId, P).current;
        const roll = random();

        const superseded = store.records.filter(
          (record) => record.status !== 'APPROVED' && record.id !== store.employeeView(record.employeeId, P).current?.id,
        );

        // Historical data: the old supervisor screen could approve a copy
        // that had already been superseded, leaving duplicate approvals.
        if (roll > 0.92 && superseded.length > 0) {
          store.supervisorApprove(superseded[Math.floor(random() * superseded.length)].id);
        } else if (!current || current.status === 'RETURNED') {
          // Only actions the current screens allow in this state.
          if (roll < 0.15 && current?.status === 'RETURNED' && random() < 0.3) {
            // Legacy (pre-fix) resubmission without lineage.
            store.legacyEmployeeResubmit(employeeId, P, Math.round(random() * 80));
          } else {
            store.employeeSubmit(employeeId, P, Math.round(random() * 80), {
              clockOffsetMinutes: random() < 0.2 ? -Math.round(random() * 600) : 0,
            });
          }
        } else if (current.status === 'PENDING_SUPERVISOR_REVIEW') {
          if (roll < 0.4) store.supervisorApprove(current.id);
          else if (roll < 0.7) store.supervisorReturn(current.id, 'Fix');
          else store.supervisorEdit(current.id, Math.round(random() * 80));
        }

        store.records.forEach((record) => {
          if (!createdSnapshots.has(record.id)) {
            createdSnapshots.set(record.id, {
              submittedAt: record.submittedAt,
              totalHours: (record as { totalHours: number }).totalHours,
              versionNumber: record.versionNumber,
            });
          }
          if (record.status === 'APPROVED') everApproved.add(record.id);
        });

        const queues = store.supervisorQueues(P);
        const packet = queues.approvedForPayroll;

        // 1. At most one packet record per employee, always current and approved.
        expect(new Set(packet.map((r) => r.employeeId)).size).toBe(packet.length);
        packet.forEach((record) => {
          expect(record.status).toBe('APPROVED');
          expect(queues.currentByEmployeeId.get(record.employeeId)?.id).toBe(record.id);
        });

        // 2. Packet total equals the sum of each employee's current approved hours.
        const expectedTotal = employees.reduce((sum, id) => {
          const currentRecord = store.employeeView(id, P).current as { status: string; totalHours: number } | null;
          return sum + (currentRecord?.status === 'APPROVED' ? currentRecord.totalHours : 0);
        }, 0);
        expect(store.approvedPacketHours(P)).toBe(expectedTotal);

        // 3. Every employee is in exactly one queue, and both screens agree.
        employees.forEach((id) => {
          const currentRecord = expectScreensAgree(store, id, P);
          const memberships = [queues.pendingReview, queues.resubmitted, queues.awaitingEmployeeResubmission, packet].filter(
            (queue) => queue.some((record) => record.employeeId === id),
          ).length;
          expect(memberships).toBe(currentRecord ? 1 : 0);
        });

        // 4. History is never lost or rewritten; approvals are never undone.
        expect(store.records).toHaveLength(createdSnapshots.size);
        store.records.forEach((record) => {
          const snapshot = createdSnapshots.get(record.id)!;
          expect(record.submittedAt).toBe(snapshot.submittedAt);
          expect((record as { totalHours: number }).totalHours).toBe(snapshot.totalHours);
          expect(record.versionNumber).toBe(snapshot.versionNumber);
        });
        everApproved.forEach((id) => {
          expect(store.records.find((record) => record.id === id)?.status).toBe('APPROVED');
        });
      }
    }
    // 300 workflows x 40 checked steps: allow more than the 5-second default.
  }, 60_000);
});
