import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import {
  asUser,
  beginAsUser,
  connect,
  createTestDatabase,
  dropTestDatabase,
  getLocalAdminUrl,
  readMigration,
  settledWithin,
  SUPABASE_SHIM_SQL,
} from './harness';

// Real-PostgreSQL tests for public.restore_returned_timecard_rows, using
// synthetic data in throwaway local databases. The production column types of
// editable_timecard_rows are not in the repository, so every test runs against
// each plausible combination (date_key text|date, updated_at and reviewed_at
// text|timestamptz). Row-level security is deliberately permissive (any
// signed-in user may write any row), as reported for production, so the
// function's own identity and ownership checks are what these tests prove.

const adminUrl = getLocalAdminUrl();
const describeDb = adminUrl ? describe : describe.skip;

const EMP = 'emp-synthetic-001';
const OTHER = 'emp-synthetic-002';
const EMP_EMAIL = 'employee.one@example.test';
const OTHER_EMAIL = 'employee.two@example.test';
const SHARED_EMAIL = 'shared.inbox@example.test'; // on two employee profiles
const STRANGER_EMAIL = 'not.an.employee@example.test';
const AUTH_IDS: Record<string, string> = {
  [EMP_EMAIL]: '00000000-0000-4000-8000-000000000001',
  [OTHER_EMAIL]: '00000000-0000-4000-8000-000000000002',
  [SHARED_EMAIL]: '00000000-0000-4000-8000-000000000003',
  [STRANGER_EMAIL]: '00000000-0000-4000-8000-000000000004',
};
/** JWT claims as Supabase issues them: the database identifies the user by sub. */
const signedIn = (email: string) => ({ email, sub: AUTH_IDS[email] });
const PERIOD = '2026-pp-20';
const PREFIX = `${EMP}-${PERIOD}-`;
const ROW_A = `${PREFIX}2026-10-06`;
const ROW_B = `${PREFIX}2026-10-07`;
const RETURNED_ID = 'timecard-synthetic-returned-1';
const MARKER = `${PREFIX}restore-marker-${RETURNED_ID}`;
const SUBMITTED_AT = '2026-10-05T16:00:00.000Z';
const REVIEWED_AT = '2026-10-06T16:00:00.000Z';
const AFTER_RETURN = '2026-10-07T08:05:00.000Z';

const returnedRows = [
  { id: ROW_A, date_key: '2026-10-06', row_data: { shiftLabel: 'R1', clockInTime: '07:00', clockOutTime: '19:00' } },
  { id: ROW_B, date_key: '2026-10-07', row_data: { shiftLabel: 'R1', clockInTime: '07:00', clockOutTime: '19:30' } },
];

const variants = [
  { dateType: 'text', updatedType: 'text' },
  { dateType: 'text', updatedType: 'timestamptz' },
  { dateType: 'date', updatedType: 'text' },
  { dateType: 'date', updatedType: 'timestamptz' },
] as const;

describeDb.each(variants)('restore_returned_timecard_rows (date_key $dateType, updated_at $updatedType)', ({ dateType, updatedType }) => {
  const dbName = `apollo_test_restore_${dateType}_${updatedType}`;
  let dbUrl = '';
  let admin: Client;
  const open: Client[] = [];

  const client = async () => {
    const c = await connect(dbUrl);
    open.push(c);
    return c;
  };

  type Call = { rows?: unknown; employeeId?: string; timecardId?: string; reviewedAt?: string | null; period?: string };
  const callRestore = (c: Client, { rows = returnedRows, employeeId = EMP, timecardId = RETURNED_ID, reviewedAt = REVIEWED_AT, period = PERIOD }: Call = {}) =>
    c.query<{ result: string }>(
      `SELECT public.restore_returned_timecard_rows($1, $2, $3, $4, $5, $6) AS result`,
      [employeeId, period, timecardId, reviewedAt, '2026-10-06', JSON.stringify(rows)],
    );

  const restoreAs = async (c: Client, email = EMP_EMAIL, call: Call = {}) =>
    (await asUser(c, signedIn(email), () => callRestore(c, call))).rows[0].result;

  const rowsNow = async () =>
    (
      await admin.query<{ id: string; clock_out: string | null; updated_at: string; marker: boolean }>(
        `SELECT id, row_data->>'clockOutTime' AS clock_out, updated_at::text AS updated_at,
                coalesce((row_data->>'restoreMarker')::boolean, false) AS marker
           FROM public.editable_timecard_rows ORDER BY id`,
      )
    ).rows;

  /** State as the employee had it when submitting (before the return). */
  const resetAsSubmitted = async () => {
    await admin.query('DELETE FROM public.editable_timecard_rows');
    await admin.query(
      `INSERT INTO public.editable_timecard_rows (id, employee_id, pay_period_key, date_key, row_data, updated_at) VALUES
        ($1, $3, $4, '2026-10-06', '{"shiftLabel":"R1","clockInTime":"07:00","clockOutTime":"18:00"}', $5),
        ($2, $3, $4, '2026-10-07', '{"shiftLabel":"R1","clockInTime":"07:00","clockOutTime":"18:30"}', $5)`,
      [ROW_A, ROW_B, EMP, PERIOD, SUBMITTED_AT],
    );
  };

  beforeAll(async () => {
    dbUrl = await createTestDatabase(adminUrl!, dbName);
    admin = await connect(dbUrl);
    await admin.query(SUPABASE_SHIM_SQL);
    // Synthetic reconstruction: the production definition is not in the repo.
    await admin.query(`
      CREATE TABLE public.employees (id text PRIMARY KEY, email text NOT NULL, role text, status text);
      CREATE TABLE public.submitted_timecards (
        id text PRIMARY KEY,
        employee_id text NOT NULL,
        pay_period_key text NOT NULL,
        status text NOT NULL,
        reviewed_at ${updatedType}
      );
      CREATE TABLE public.editable_timecard_rows (
        id text PRIMARY KEY,
        employee_id text NOT NULL,
        pay_period_key text NOT NULL,
        date_key ${dateType},
        row_data jsonb,
        updated_at ${updatedType}
      );
      ALTER TABLE public.editable_timecard_rows ENABLE ROW LEVEL SECURITY;
      CREATE POLICY any_signed_in_user ON public.editable_timecard_rows FOR ALL TO authenticated
        USING (true) WITH CHECK (true);
      ALTER TABLE public.submitted_timecards ENABLE ROW LEVEL SECURITY;
      CREATE POLICY any_signed_in_user ON public.submitted_timecards FOR ALL TO authenticated
        USING (true) WITH CHECK (true);
      GRANT SELECT ON public.employees TO authenticated;
      GRANT SELECT, INSERT, UPDATE ON public.editable_timecard_rows, public.submitted_timecards TO authenticated;
      INSERT INTO public.employees VALUES
        ('${EMP}', '  Employee.One@Example.TEST ', 'EMT', 'Active'),
        ('${OTHER}', '${OTHER_EMAIL}', 'EMT', 'Active'),
        ('emp-synthetic-003', '${SHARED_EMAIL}', 'EMT', 'Active'),
        ('emp-synthetic-004', '${SHARED_EMAIL}', 'EMT', 'Active');
      INSERT INTO public.submitted_timecards VALUES
        ('${RETURNED_ID}', '${EMP}', '${PERIOD}', 'RETURNED', '${REVIEWED_AT}'),
        ('tc-other-employee-returned', '${OTHER}', '${PERIOD}', 'RETURNED', '${REVIEWED_AT}'),
        ('tc-own-pending', '${EMP}', '${PERIOD}', 'PENDING_SUPERVISOR_REVIEW', '${REVIEWED_AT}'),
        ('tc-own-approved', '${EMP}', '${PERIOD}', 'APPROVED', '${REVIEWED_AT}'),
        ('tc-own-other-period', '${EMP}', '2026-pp-19', 'RETURNED', '${REVIEWED_AT}'),
        ('tc-own-returned-no-time', '${EMP}', '${PERIOD}', 'RETURNED', NULL),
        ('tc-shared-inbox-returned', 'emp-synthetic-003', '${PERIOD}', 'RETURNED', '${REVIEWED_AT}');
    `);
    for (const [email, id] of Object.entries(AUTH_IDS)) {
      await admin.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [id, email]);
    }
    await admin.query(readMigration('202610140001_restore_returned_timecard_rows.sql'));
  });

  // Closing a connection rolls back anything a failed test left open, so one
  // failure can never block the next test.
  afterEach(async () => {
    await Promise.all(open.splice(0).map((c) => c.end().catch(() => undefined)));
  });

  afterAll(async () => {
    await admin?.end().catch(() => undefined);
    if (adminUrl) await dropTestDatabase(adminUrl, dbName);
  });

  it('copies the returned rows and records the marker in one call', async () => {
    await resetAsSubmitted();
    expect(await restoreAs(await client())).toBe('RESTORED');
    const rows = await rowsNow();
    expect(rows.find((r) => r.id === ROW_A)?.clock_out).toBe('19:00');
    expect(rows.find((r) => r.id === ROW_B)?.clock_out).toBe('19:30');
    const marker = await admin.query(`SELECT row_data FROM public.editable_timecard_rows WHERE id = $1`, [MARKER]);
    expect(marker.rows[0].row_data).toMatchObject({ deleted: true, restoreMarker: true, restoredFromTimecardId: RETURNED_ID, rowsCopied: 2 });
  });

  it('is idempotent: later calls change nothing', async () => {
    await resetAsSubmitted();
    const c = await client();
    await restoreAs(c);
    const before = await rowsNow();
    expect(await restoreAs(c)).toBe('ALREADY_RESTORED');
    expect(await restoreAs(c)).toBe('ALREADY_RESTORED');
    expect(await rowsNow()).toEqual(before);
  });

  it('records only the marker when rows were saved after the return (cards returned before release)', async () => {
    await resetAsSubmitted();
    await admin.query(
      `UPDATE public.editable_timecard_rows SET row_data = row_data || '{"clockOutTime":"19:45"}', updated_at = $2 WHERE id = $1`,
      [ROW_A, AFTER_RETURN],
    );
    expect(await restoreAs(await client())).toBe('MARKER_ONLY');
    const rows = await rowsNow();
    expect(rows.find((r) => r.id === ROW_A)?.clock_out).toBe('19:45');
    expect(rows.find((r) => r.id === ROW_B)?.clock_out).toBe('18:30');
    expect(rows.some((r) => r.id === MARKER)).toBe(true);
  });

  it('two devices restoring at once: the second waits, then writes nothing', async () => {
    await resetAsSubmitted();
    const deviceA = await client();
    const deviceB = await client();

    await beginAsUser(deviceA, signedIn(EMP_EMAIL));
    expect((await callRestore(deviceA)).rows[0].result).toBe('RESTORED');

    const deviceBCall = restoreAs(deviceB);
    expect(await settledWithin(deviceBCall, 400)).toBe('pending');

    await deviceA.query('COMMIT');
    expect(await deviceBCall).toBe('ALREADY_RESTORED');
  });

  it('a correction committed while a restore is running is never overwritten', async () => {
    await resetAsSubmitted();
    const editor = await client();
    const restorer = await client();

    // The employee saves a correction on one device; not yet committed.
    await beginAsUser(editor, signedIn(EMP_EMAIL));
    await editor.query(
      `UPDATE public.editable_timecard_rows SET row_data = row_data || '{"clockOutTime":"19:45"}', updated_at = $2 WHERE id = $1`,
      [ROW_A, AFTER_RETURN],
    );

    // Another device restores; it must wait for the row the correction holds.
    const restoreCall = restoreAs(restorer);
    expect(await settledWithin(restoreCall, 400)).toBe('pending');

    await editor.query('COMMIT');
    expect(await restoreCall).toBe('RESTORED');

    const rows = await rowsNow();
    expect(rows.find((r) => r.id === ROW_A)?.clock_out).toBe('19:45'); // correction kept
    expect(rows.find((r) => r.id === ROW_B)?.clock_out).toBe('19:30'); // untouched row restored
  });

  it('two devices plus an edit (the earlier failing scenario): the correction survives', async () => {
    await resetAsSubmitted();
    const deviceA = await client();
    const deviceB = await client();
    expect(await restoreAs(deviceA)).toBe('RESTORED');
    await asUser(deviceA, signedIn(EMP_EMAIL), () =>
      deviceA.query(
        `UPDATE public.editable_timecard_rows SET row_data = row_data || '{"clockOutTime":"19:45"}', updated_at = $2 WHERE id = $1`,
        [ROW_A, new Date().toISOString()],
      ),
    );
    expect(await restoreAs(deviceB)).toBe('ALREADY_RESTORED');
    expect((await rowsNow()).find((r) => r.id === ROW_A)?.clock_out).toBe('19:45');
  });

  it('twelve devices at once: exactly one restores, the rest change nothing', async () => {
    await resetAsSubmitted();
    const devices = await Promise.all(Array.from({ length: 12 }, () => client()));
    const results = await Promise.all(devices.map((d) => restoreAs(d)));
    expect(results.filter((r) => r === 'RESTORED')).toHaveLength(1);
    expect(results.filter((r) => r === 'ALREADY_RESTORED')).toHaveLength(11);
    const rows = await rowsNow();
    expect(rows.filter((r) => r.marker)).toHaveLength(1);
    expect(rows.find((r) => r.id === ROW_A)?.clock_out).toBe('19:00');
  });

  it('a failure part-way through saves nothing, and a retry then succeeds', async () => {
    await resetAsSubmitted();
    const c = await client();
    // Duplicate ids make the copy statement fail after validation passed.
    const duplicate = [returnedRows[0], { ...returnedRows[0], row_data: { clockOutTime: '20:00' } }];
    await expect(restoreAs(c, EMP_EMAIL, { rows: duplicate })).rejects.toThrow();
    const rows = await rowsNow();
    expect(rows.some((r) => r.id === MARKER)).toBe(false);
    expect(rows.find((r) => r.id === ROW_A)?.clock_out).toBe('18:00');
    expect(await restoreAs(c)).toBe('RESTORED');
  });

  it('rejects malformed input before writing anything', async () => {
    await resetAsSubmitted();
    const c = await client();
    const cases: unknown[] = [
      [{ ...returnedRows[0], id: 'emp-someone-else-2026-pp-20-2026-10-06' }],
      [{ ...returnedRows[0], id: MARKER }],
      [{ ...returnedRows[0], row_data: 'not-an-object' }],
      [{ id: ROW_A, row_data: {} }],
      { not: 'an array' },
    ];
    for (const rows of cases) {
      await expect(restoreAs(c, EMP_EMAIL, { rows })).rejects.toMatchObject({ code: '22023' });
    }
    expect((await rowsNow()).some((r) => r.id === MARKER)).toBe(false);
  });

  /** Every rejected call must leave the table exactly as it was. */
  const expectRejectedWithoutChanges = async (attempt: () => Promise<unknown>, code: string) => {
    const before = await rowsNow();
    await expect(attempt()).rejects.toMatchObject({ code });
    expect(await rowsNow()).toEqual(before);
  };

  it('identifies the caller in the database, ignoring email case and spacing', async () => {
    await resetAsSubmitted();
    expect(await restoreAs(await client(), EMP_EMAIL)).toBe('RESTORED');
  });

  it('rejects unauthorized callers: no signed-in user, no employee profile, or an ambiguous profile', async () => {
    await resetAsSubmitted();
    const c = await client();
    // Signed-in role but no user id (sub) in the token.
    await expectRejectedWithoutChanges(() => asUser(c, { email: EMP_EMAIL }, () => callRestore(c)), '42501');
    // A real sign-in whose email belongs to no employee.
    await expectRejectedWithoutChanges(() => restoreAs(c, STRANGER_EMAIL), '42501');
    // An email shared by two employee profiles is never guessed between.
    await expectRejectedWithoutChanges(
      () => restoreAs(c, SHARED_EMAIL, { employeeId: 'emp-synthetic-003', rows: [], timecardId: 'tc-shared-inbox-returned' }),
      '42501',
    );
    // A token whose email claim is forged: identity comes from auth.users, not the claim.
    await expectRejectedWithoutChanges(
      () => asUser(c, { email: EMP_EMAIL, sub: AUTH_IDS[OTHER_EMAIL] }, () => callRestore(c)),
      '42501',
    );
  });

  it('rejects a mismatched employee id, in either direction, even though row-level security would allow it', async () => {
    await resetAsSubmitted();
    const c = await client();
    // Another employee names this employee and their returned card.
    await expectRejectedWithoutChanges(() => restoreAs(c, OTHER_EMAIL), '42501');
    // This employee names another employee, with rows shaped for that employee.
    const otherRows = [{ ...returnedRows[0], id: `${OTHER}-${PERIOD}-2026-10-06` }];
    await expectRejectedWithoutChanges(
      () => restoreAs(c, EMP_EMAIL, { employeeId: OTHER, rows: otherRows, timecardId: 'tc-other-employee-returned' }),
      '42501',
    );
  });

  it('rejects forged returned-timecard references', async () => {
    await resetAsSubmitted();
    const c = await client();
    for (const timecardId of ['tc-other-employee-returned', 'tc-own-pending', 'tc-own-approved', 'tc-does-not-exist']) {
      await expectRejectedWithoutChanges(() => restoreAs(c, EMP_EMAIL, { timecardId }), '42501');
    }
    // Own returned card, but claimed for a different pay period.
    await expectRejectedWithoutChanges(() => restoreAs(c, EMP_EMAIL, { timecardId: 'tc-own-other-period' }), '42501');
    await expectRejectedWithoutChanges(
      () => restoreAs(c, EMP_EMAIL, { period: '2026-pp-19', rows: [], timecardId: RETURNED_ID }),
      '42501',
    );
  });

  it('rejects missing, invalid or altered return times, so corrections stay protected', async () => {
    await resetAsSubmitted();
    // The employee corrected a row after the return.
    await admin.query(
      `UPDATE public.editable_timecard_rows SET row_data = row_data || '{"clockOutTime":"19:45"}', updated_at = $2 WHERE id = $1`,
      [ROW_A, AFTER_RETURN],
    );
    const c = await client();
    await expectRejectedWithoutChanges(() => restoreAs(c, EMP_EMAIL, { reviewedAt: null }), '22023');
    // A later time would have let the restore overwrite the correction.
    await expectRejectedWithoutChanges(() => restoreAs(c, EMP_EMAIL, { reviewedAt: '2030-01-01T00:00:00.000Z' }), '22023');
    await expectRejectedWithoutChanges(() => restoreAs(c, EMP_EMAIL, { reviewedAt: SUBMITTED_AT }), '22023');
    // A time sent for a legacy card that has none stored.
    await expectRejectedWithoutChanges(() => restoreAs(c, EMP_EMAIL, { timecardId: 'tc-own-returned-no-time' }), '22023');
    if (updatedType === 'text') {
      await admin.query(
        `INSERT INTO public.submitted_timecards VALUES ('tc-own-returned-bad-time', $1, $2, 'RETURNED', 'not a time')
           ON CONFLICT (id) DO NOTHING`,
        [EMP, PERIOD],
      );
      await expectRejectedWithoutChanges(() => restoreAs(c, EMP_EMAIL, { timecardId: 'tc-own-returned-bad-time' }), '22023');
    }
    // With the genuine return time the correction is still kept.
    expect(await restoreAs(c)).toBe('MARKER_ONLY');
    expect((await rowsNow()).find((r) => r.id === ROW_A)?.clock_out).toBe('19:45');
  });

  describe('legacy returned card (no reviewed_at stored)', () => {
    const LEGACY = 'tc-own-returned-no-time';
    const legacyMarker = `${PREFIX}restore-marker-${LEGACY}`;
    const restoreLegacy = (c: Client, email = EMP_EMAIL) => restoreAs(c, email, { timecardId: LEGACY, reviewedAt: null });

    it('opens without error and keeps every saved row, including old corrections', async () => {
      await resetAsSubmitted();
      // Corrected long ago: with no return time this cannot be told apart from a correction.
      await admin.query(
        `UPDATE public.editable_timecard_rows SET row_data = row_data || '{"clockOutTime":"19:45"}', updated_at = $2 WHERE id = $1`,
        [ROW_A, '2020-01-01T00:00:00.000Z'],
      );
      const c = await client();
      expect(await restoreLegacy(c)).toBe('MARKER_ONLY');
      expect(await restoreLegacy(c)).toBe('ALREADY_RESTORED');
      const rows = await rowsNow();
      expect(rows.find((r) => r.id === ROW_A)?.clock_out).toBe('19:45');
      expect(rows.find((r) => r.id === ROW_B)?.clock_out).toBe('18:30');
      expect(rows.filter((r) => r.marker).map((r) => r.id)).toEqual([legacyMarker]);
      const card = await admin.query(`SELECT status, reviewed_at FROM public.submitted_timecards WHERE id = $1`, [LEGACY]);
      expect(card.rows[0]).toEqual({ status: 'RETURNED', reviewed_at: null }); // nothing invented
    });

    it('copies the returned shifts when the employee has no saved rows', async () => {
      await admin.query('DELETE FROM public.editable_timecard_rows');
      expect(await restoreLegacy(await client())).toBe('RESTORED');
      const rows = await rowsNow();
      expect(rows.find((r) => r.id === ROW_A)?.clock_out).toBe('19:00');
      expect(rows.find((r) => r.id === ROW_B)?.clock_out).toBe('19:30');
    });

    it('a row saved by another device during the copy is never overwritten', async () => {
      await admin.query('DELETE FROM public.editable_timecard_rows');
      const editor = await client();
      const restorer = await client();
      await beginAsUser(editor, signedIn(EMP_EMAIL));
      await editor.query(
        `INSERT INTO public.editable_timecard_rows (id, employee_id, pay_period_key, date_key, row_data, updated_at)
         VALUES ($1, $2, $3, '2026-10-06', '{"clockOutTime":"20:15"}', NULL)`,
        [ROW_A, EMP, PERIOD],
      );
      const restoreCall = restoreLegacy(restorer);
      expect(await settledWithin(restoreCall, 400)).toBe('pending');
      await editor.query('COMMIT');
      expect(await restoreCall).toBe('RESTORED');
      const rows = await rowsNow();
      expect(rows.find((r) => r.id === ROW_A)?.clock_out).toBe('20:15'); // the employee's save wins
      expect(rows.find((r) => r.id === ROW_B)?.clock_out).toBe('19:30');
    });

    it("cannot be used on another employee's legacy card", async () => {
      await resetAsSubmitted();
      const intruder = await client();
      await expectRejectedWithoutChanges(() => restoreLegacy(intruder, OTHER_EMAIL), '42501');
    });
  });

  it('a returned card with no shifts records only the marker', async () => {
    await resetAsSubmitted();
    expect(await restoreAs(await client(), EMP_EMAIL, { rows: [] })).toBe('RESTORED');
    const rows = await rowsNow();
    expect(rows.find((r) => r.id === ROW_A)?.clock_out).toBe('18:00');
    expect(rows.filter((r) => r.marker)).toHaveLength(1);
  });

  it('cannot be executed by anonymous (signed-out) callers', async () => {
    const anon = await client();
    await anon.query('BEGIN');
    await anon.query('SET LOCAL ROLE anon');
    await expect(callRestore(anon)).rejects.toThrow(/permission denied/);
    await anon.query('ROLLBACK');
  });
});
