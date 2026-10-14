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
// each plausible combination (date_key text|date, updated_at text|timestamptz).

const adminUrl = getLocalAdminUrl();
const describeDb = adminUrl ? describe : describe.skip;

const EMP = 'emp-synthetic-001';
const OTHER = 'emp-synthetic-002';
const EMP_EMAIL = 'employee.one@example.test';
const OTHER_EMAIL = 'employee.two@example.test';
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

  const callRestore = (c: Client, rows: unknown = returnedRows, employeeId = EMP) =>
    c.query<{ result: string }>(
      `SELECT public.restore_returned_timecard_rows($1, $2, $3, $4, $5, $6) AS result`,
      [employeeId, PERIOD, RETURNED_ID, REVIEWED_AT, '2026-10-06', JSON.stringify(rows)],
    );

  const restoreAs = async (c: Client, email = EMP_EMAIL, rows: unknown = returnedRows, employeeId = EMP) =>
    (await asUser(c, { email }, () => callRestore(c, rows, employeeId))).rows[0].result;

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
      CREATE TABLE public.editable_timecard_rows (
        id text PRIMARY KEY,
        employee_id text NOT NULL,
        pay_period_key text NOT NULL,
        date_key ${dateType},
        row_data jsonb,
        updated_at ${updatedType}
      );
      ALTER TABLE public.editable_timecard_rows ENABLE ROW LEVEL SECURITY;
      CREATE POLICY employee_own_rows ON public.editable_timecard_rows FOR ALL TO authenticated
        USING (employee_id IN (SELECT id FROM public.employees WHERE lower(email) = lower(auth.jwt()->>'email')))
        WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE lower(email) = lower(auth.jwt()->>'email')));
      GRANT SELECT ON public.employees TO authenticated;
      GRANT SELECT, INSERT, UPDATE ON public.editable_timecard_rows TO authenticated;
      INSERT INTO public.employees VALUES
        ('${EMP}', '${EMP_EMAIL}', 'EMT', 'Active'),
        ('${OTHER}', '${OTHER_EMAIL}', 'EMT', 'Active');
    `);
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

    await beginAsUser(deviceA, { email: EMP_EMAIL });
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
    await beginAsUser(editor, { email: EMP_EMAIL });
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
    await asUser(deviceA, { email: EMP_EMAIL }, () =>
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
    await expect(restoreAs(c, EMP_EMAIL, duplicate)).rejects.toThrow();
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
      await expect(restoreAs(c, EMP_EMAIL, rows)).rejects.toMatchObject({ code: '22023' });
    }
    expect((await rowsNow()).some((r) => r.id === MARKER)).toBe(false);
  });

  it('respects row-level security: another employee cannot restore or alter these rows', async () => {
    await resetAsSubmitted();
    const intruder = await client();
    await expect(restoreAs(intruder, OTHER_EMAIL)).rejects.toThrow(/row-level security/);
    const rows = await rowsNow();
    expect(rows.some((r) => r.id === MARKER)).toBe(false);
    expect(rows.find((r) => r.id === ROW_A)?.clock_out).toBe('18:00');
  });

  it('a returned card with no shifts records only the marker', async () => {
    await resetAsSubmitted();
    expect(await restoreAs(await client(), EMP_EMAIL, [])).toBe('RESTORED');
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
