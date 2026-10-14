import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import {
  buildRestoreRpcRows,
  buildSupervisorTimecardQueues,
  checkTimecardSignature,
  evaluateEmployeeSubmission,
  getEmployeeSubmissionVersionFields,
  getEmployeeTimecardState,
  type TimecardStatus,
  type TimecardVersionRecord,
} from '@/lib/timecardWorkflow';
import { asUser, connect, createTestDatabase, dropTestDatabase, getLocalAdminUrl, SUPABASE_SHIM_SQL } from './harness';

// The complete staging stack (reconstructed base schema, every repository
// migration, staging access rules and synthetic seed) on a real local
// PostgreSQL server, exercised with the app's own workflow rules. Synthetic
// data only; this never connects to Supabase.

const adminUrl = getLocalAdminUrl();
const describeDb = adminUrl ? describe : describe.skip;
const repo = path.resolve(__dirname, '../..');
const read = (relative: string) => readFileSync(path.join(repo, relative), 'utf8');

const SUPERVISOR = 'morgan.reyes@example.test';
const AVERY = 'avery.chen@example.test';
const RILEY = 'riley.okafor@example.test';
const REMOVED = 'former.employee@example.test';

type Row = {
  id: string;
  employee_id: string;
  pay_period_key: string;
  status: TimecardStatus;
  submitted_at: Date;
  version_number: number | null;
  parent_timecard_id: string | null;
  reviewed_at: Date | null;
  total_hours: string;
  submission_acknowledgement: { submissionAction?: string } | null;
};

const toRecord = (row: Row): TimecardVersionRecord & { totalHours: number } => ({
  id: row.id,
  employeeId: row.employee_id,
  payPeriodKey: row.pay_period_key,
  status: row.status,
  submittedAt: row.submitted_at.toISOString(),
  versionNumber: row.version_number,
  parentTimecardId: row.parent_timecard_id,
  reviewedAt: row.reviewed_at?.toISOString() ?? null,
  submissionAcknowledgement: row.submission_acknowledgement,
  totalHours: Number(row.total_hours),
});

describeDb('staging schema, access rules and timecard workflow (local PostgreSQL)', () => {
  const dbName = 'apollo_test_staging_workflow';
  let dbUrl = '';
  let admin: Client;
  const open: Client[] = [];
  const client = async () => {
    const c = await connect(dbUrl);
    open.push(c);
    return c;
  };
  const timecardsAs = async (email: string, period?: string) => {
    const c = await client();
    return asUser(c, { email }, async () =>
      (
        await c.query<Row>(
          `SELECT * FROM public.submitted_timecards ${period ? 'WHERE pay_period_key = $1' : ''} ORDER BY id`,
          period ? [period] : [],
        )
      ).rows.map(toRecord),
    );
  };

  beforeAll(async () => {
    dbUrl = await createTestDatabase(adminUrl!, dbName);
    admin = await connect(dbUrl);
    await admin.query(SUPABASE_SHIM_SQL);
    await admin.query(read('supabase/staging/001_reconstructed_base_schema.sql'));
    for (const file of readdirSync(path.join(repo, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort()) {
      await admin.query(read(`supabase/migrations/${file}`));
    }
    await admin.query(read('supabase/staging/002_staging_access_rules.sql'));
    await admin.query(read('supabase/staging/003_synthetic_seed.sql'));
  });

  afterEach(async () => {
    await Promise.all(open.splice(0).map((c) => c.end().catch(() => undefined)));
  });

  afterAll(async () => {
    await admin?.end().catch(() => undefined);
    if (adminUrl) await dropTestDatabase(adminUrl, dbName);
  });

  it('the base schema refuses to run on a database that already has the tables', async () => {
    await expect(admin.query(read('supabase/staging/001_reconstructed_base_schema.sql'))).rejects.toThrow(/Refusing to run/);
  });

  describe('authorization', () => {
    it('an employee sees only their own timecards; a supervisor sees all', async () => {
      const own = await timecardsAs(AVERY);
      expect(own.length).toBeGreaterThan(0);
      expect(new Set(own.map((r) => r.employeeId))).toEqual(new Set(['emp-stg-emt-1']));
      expect((await timecardsAs(SUPERVISOR)).length).toBe(12);
    });

    it('a removed employee and a stranger see nothing', async () => {
      expect(await timecardsAs(REMOVED)).toEqual([]);
      expect(await timecardsAs('stranger@example.test')).toEqual([]);
    });

    it('signed-out callers have no access at all', async () => {
      const c = await client();
      await c.query('BEGIN');
      await c.query('SET LOCAL ROLE anon');
      await expect(c.query('SELECT 1 FROM public.submitted_timecards')).rejects.toThrow(/permission denied/);
      await c.query('ROLLBACK');
    });

    it('an employee cannot submit for someone else or submit an already-approved card', async () => {
      const c = await client();
      const insert = (employeeId: string, status: string) =>
        asUser(c, { email: AVERY }, () =>
          c.query(
            `INSERT INTO public.submitted_timecards (id, employee_id, pay_period_key, pay_period_start, pay_period_end, submitted_at, status)
             VALUES ($1, $2, '2026-pp-22', 'x', 'y', now(), $3)`,
            [`forged-${employeeId}-${status}`, employeeId, status],
          ),
        );
      await expect(insert('emp-stg-emt-2', 'PENDING_SUPERVISOR_REVIEW')).rejects.toThrow(/row-level security/);
      await expect(insert('emp-stg-emt-1', 'APPROVED')).rejects.toThrow(/row-level security/);
    });

    it('an employee cannot approve their own timecard; a supervisor can', async () => {
      const employee = await client();
      const result = await asUser(employee, { email: AVERY }, () =>
        employee.query(`UPDATE public.submitted_timecards SET status = 'APPROVED' WHERE id = 'stg-pp21-avery-v1'`),
      );
      expect(result.rowCount).toBe(0);
      const supervisor = await client();
      const approved = await asUser(supervisor, { email: SUPERVISOR }, () =>
        supervisor.query(`UPDATE public.submitted_timecards SET status = 'APPROVED' WHERE id = 'stg-pp22-taylor-v1'`),
      );
      expect(approved.rowCount).toBe(1);
    });

    it('employees read the payroll lock but cannot finalize payroll', async () => {
      const c = await client();
      const keys = await asUser(c, { email: AVERY }, () => c.query(`SELECT pay_period_key FROM public.payroll_submissions`));
      expect(keys.rows.map((r) => r.pay_period_key)).toEqual(['2026-pp-20']);
      await expect(
        asUser(c, { email: AVERY }, () => c.query(`INSERT INTO public.payroll_submissions (pay_period_key) VALUES ('2026-pp-21')`)),
      ).rejects.toThrow(/row-level security/);
    });

    it("an employee cannot read or restore another employee's editable rows", async () => {
      const c = await client();
      const rows = await asUser(c, { email: AVERY }, () =>
        c.query(`SELECT id FROM public.editable_timecard_rows WHERE employee_id = 'emp-stg-emt-2'`),
      );
      expect(rows.rowCount).toBe(0);
      await expect(
        asUser(c, { email: AVERY }, () =>
          c.query(`SELECT public.restore_returned_timecard_rows('emp-stg-emt-2', '2026-pp-21', 'stg-pp21-riley-v1', now(), '2026-10-02', '[]')`),
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });

  describe('workflow with the shared rules', () => {
    it('supervisor queues for the previous period place every employee correctly, including the original deadlock', async () => {
      const queues = buildSupervisorTimecardQueues(await timecardsAs(SUPERVISOR, '2026-pp-21'));
      expect(queues.pendingReview.map((r) => r.id)).toEqual(['stg-pp21-avery-v1']);
      expect(queues.resubmitted.map((r) => r.id).sort()).toEqual(['stg-pp21-casey-legacy-resub', 'stg-pp21-drew-v2']);
      expect(queues.awaitingEmployeeResubmission.map((r) => r.id)).toEqual(['stg-pp21-riley-v1']);
      expect(queues.approvedForPayroll.map((r) => r.id)).toEqual(['stg-pp21-taylor-v1']);
    });

    it('the finalized period packet has one record per employee and the correct total', async () => {
      const queues = buildSupervisorTimecardQueues(await timecardsAs(SUPERVISOR, '2026-pp-20'));
      const packet = queues.approvedForPayroll as Array<TimecardVersionRecord & { totalHours: number }>;
      expect(packet.map((r) => r.id).sort()).toEqual(['stg-pp20-avery-v2', 'stg-pp20-taylor-v1']);
      expect(packet.reduce((sum, r) => sum + r.totalHours, 0)).toBe(71.5);
    });

    it('returned card: restore, correct, sign and resubmit as the employee; approve as the supervisor', async () => {
      const riley = await client();
      const period = '2026-pp-21';
      const prefix = 'emp-stg-emt-2-2026-pp-21-';

      const own = await timecardsAs(RILEY, period);
      const state = getEmployeeTimecardState(own, 'emp-stg-emt-2', period);
      expect(state.returnedRecord?.id).toBe('stg-pp21-riley-v1');

      const restored = await asUser(riley, { email: RILEY }, () =>
        riley.query<{ r: string }>(`SELECT public.restore_returned_timecard_rows($1, $2, $3, $4, $5, $6) AS r`, [
          'emp-stg-emt-2', period, 'stg-pp21-riley-v1', state.returnedRecord!.reviewedAt, '2026-10-02',
          JSON.stringify(buildRestoreRpcRows({ [`${prefix}2026-10-02`]: { shiftLabel: 'R1', clockOutTime: '19:00' } }, prefix)),
        ]),
      );
      expect(restored.rows[0].r).toBe('RESTORED');

      await asUser(riley, { email: RILEY }, () =>
        riley.query(
          `UPDATE public.editable_timecard_rows SET row_data = row_data || '{"clockOutTime":"21:00"}', updated_at = now() WHERE id = $1`,
          [`${prefix}2026-10-02`],
        ),
      );

      const profile = await admin.query(`SELECT first_name, last_name FROM public.employees WHERE id = 'emp-stg-emt-2'`);
      const signature = checkTimecardSignature('riley okafor', {
        firstName: profile.rows[0].first_name,
        lastName: profile.rows[0].last_name,
        name: `${profile.rows[0].last_name}, ${profile.rows[0].first_name}`,
      });
      expect(signature.valid).toBe(true);

      expect(
        evaluateEmployeeSubmission({ hasEmployeeProfile: true, isSubmitting: false, isWithinEmployeeEditWindow: true, isPayrollFinalized: false, current: state.current }),
      ).toEqual({ allowed: true, isResubmission: true });
      const fields = getEmployeeSubmissionVersionFields(own, 'emp-stg-emt-2');
      await asUser(riley, { email: RILEY }, () =>
        riley.query(
          `INSERT INTO public.submitted_timecards (id, employee_id, employee_name, pay_period_key, pay_period_start, pay_period_end,
             submitted_at, total_hours, submission_acknowledgement, status, version_number, parent_timecard_id, version_reason,
             created_by_role, created_by_employee_id)
           VALUES ('stg-pp21-riley-v2', 'emp-stg-emt-2', 'Okafor, Riley', $1, '2026-09-27T07:00:00.000Z', '2026-10-10T07:00:00.000Z',
             now(), 14, $2, 'PENDING_SUPERVISOR_REVIEW', $3, $4, $5, 'EMPLOYEE', 'emp-stg-emt-2')`,
          [period, JSON.stringify({ submissionAction: fields.submissionAction }), fields.versionNumber, fields.parentTimecardId, fields.versionReason],
        ),
      );

      let queues = buildSupervisorTimecardQueues(await timecardsAs(SUPERVISOR, period));
      expect(queues.resubmitted.map((r) => r.id)).toContain('stg-pp21-riley-v2');
      expect(queues.awaitingEmployeeResubmission).toEqual([]);

      const supervisor = await client();
      await asUser(supervisor, { email: SUPERVISOR }, () =>
        supervisor.query(`UPDATE public.submitted_timecards SET status = 'APPROVED', reviewed_at = now() WHERE id = 'stg-pp21-riley-v2'`),
      );
      queues = buildSupervisorTimecardQueues(await timecardsAs(SUPERVISOR, period));
      expect(queues.approvedForPayroll.map((r) => r.id).sort()).toEqual(['stg-pp21-riley-v2', 'stg-pp21-taylor-v1']);
      expect(getEmployeeTimecardState(await timecardsAs(RILEY, period), 'emp-stg-emt-2', period).current?.status).toBe('APPROVED');

      // History is intact: the returned original is still there, unchanged.
      const original = await admin.query(`SELECT status, total_hours FROM public.submitted_timecards WHERE id = 'stg-pp21-riley-v1'`);
      expect(original.rows[0]).toMatchObject({ status: 'RETURNED', total_hours: '12' });
    });

    it('signatures work for hyphenated and accented names stored in the database', async () => {
      const rows = await admin.query(
        `SELECT id, first_name, last_name FROM public.employees WHERE id IN ('emp-stg-medic-3', 'emp-stg-emt-4') ORDER BY id`,
      );
      const byId = Object.fromEntries(rows.rows.map((r) => [r.id, { firstName: r.first_name, lastName: r.last_name }]));
      expect(checkTimecardSignature('Jamie Ortiz Lane', byId['emp-stg-medic-3']).valid).toBe(true);
      expect(checkTimecardSignature('jose alvarez', byId['emp-stg-emt-4']).valid).toBe(true);
      expect(checkTimecardSignature('Jose Alvarez', byId['emp-stg-medic-3']).valid).toBe(false);
    });

    it('nobody can submit into the finalized period until payroll is reopened', async () => {
      const keys = (await admin.query(`SELECT pay_period_key FROM public.payroll_submissions`)).rows.map((r) => r.pay_period_key);
      const check = (finalized: boolean) =>
        evaluateEmployeeSubmission({ hasEmployeeProfile: true, isSubmitting: false, isWithinEmployeeEditWindow: true, isPayrollFinalized: finalized, current: null });
      expect(check(keys.includes('2026-pp-20'))).toMatchObject({ allowed: false, reason: 'PAYROLL_FINALIZED' });
      expect(check(keys.includes('2026-pp-22'))).toEqual({ allowed: true, isResubmission: false });
    });
  });
});
