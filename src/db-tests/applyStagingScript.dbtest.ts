import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect, createTestDatabase, dropTestDatabase, getLocalAdminUrl, SUPABASE_SHIM_SQL } from './harness';

// Exercises scripts/apply-staging.sh itself. Rejection cases never open a
// connection (they fail during validation); rehearsals use a local database.

const adminUrl = getLocalAdminUrl();
const describeDb = adminUrl ? describe : describe.skip;
const script = path.resolve(__dirname, '../../scripts/apply-staging.sh');

function run(args: string[], env: Record<string, string | undefined> = {}, input = '') {
  const result = spawnSync('bash', [script, ...args], {
    env: { NODE_ENV: 'test', PATH: process.env.PATH, HOME: process.env.HOME, ...env },
    input,
    encoding: 'utf8',
    timeout: 120_000,
  });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

const staging = (url: string) => run([], { STAGING_DATABASE_URL: url, PGPASSWORD: 'unused-in-validation' });

describe('apply-staging.sh refuses unsafe targets before connecting', () => {
  it.each([
    ['production ref as the pooler user', 'postgresql://postgres.xyrusrspvyuwpplhhett@aws-0-us-west-2.pooler.supabase.com:5432/postgres', /PRODUCTION/],
    ['production direct host', 'postgresql://postgres@db.xyrusrspvyuwpplhhett.supabase.co:5432/postgres', /PRODUCTION/],
    ['production ref in upper case', 'postgresql://postgres.XYRUSRSPVYUWPPLHHETT@aws-0-us-west-2.pooler.supabase.com:5432/postgres', /PRODUCTION/],
    ['production ref hidden in a parameter', 'postgresql://postgres.eejahcuftznsabulssew@aws-0-us-west-2.pooler.supabase.com:5432/postgres?application_name=xyrusrspvyuwpplhhett', /PRODUCTION/],
    ['staging ref only in the database name', 'postgresql://postgres.otherprojectref123456@aws-0-us-west-2.pooler.supabase.com:5432/eejahcuftznsabulssew', /must be to staging project/],
    ['another project', 'postgresql://postgres.abcdefghijklmnopqrst@aws-0-us-west-2.pooler.supabase.com:5432/postgres', /must be to staging project/],
    ['staging user on a non-Supabase host', 'postgresql://postgres.eejahcuftznsabulssew@db.attacker.example:5432/postgres', /not a Supabase host/],
    ['transaction pooler port', 'postgresql://postgres.eejahcuftznsabulssew@aws-0-us-west-2.pooler.supabase.com:6543/postgres', /session pooler/],
    ['password inside the URL', 'postgresql://postgres.eejahcuftznsabulssew:secret@aws-0-us-west-2.pooler.supabase.com:5432/postgres', /do not put the password/],
    ['not a URL', 'eejahcuftznsabulssew', /not a valid postgresql/],
    ['wrong scheme', 'https://eejahcuftznsabulssew.supabase.co', /not a valid postgresql/],
    ['missing host', 'postgresql://', /not a valid postgresql/],
  ])('%s', (_name, url, message) => {
    const { code, out } = staging(url);
    expect(code).toBe(2);
    expect(out).toMatch(message);
    expect(out).not.toMatch(/Server reports/);
  });

  it('no connection string at all', () => {
    const { code, out } = run([]);
    expect(code).toBe(2);
    expect(out).toMatch(/no connection string/);
  });

  it('local rehearsal mode cannot be pointed at a remote server', () => {
    const { code, out } = run(['--local-rehearsal', 'postgresql://postgres@db.eejahcuftznsabulssew.supabase.co:5432/postgres']);
    expect(code).toBe(2);
    expect(out).toMatch(/only targets a PostgreSQL server on this machine/);
  });
});

describeDb('apply-staging.sh rehearsal on local PostgreSQL', () => {
  const names = { fresh: 'apollo_test_apply_fresh', occupied: 'apollo_test_apply_occupied', cancel: 'apollo_test_apply_cancel' };
  const urls: Record<string, string> = {};

  beforeAll(async () => {
    for (const [key, name] of Object.entries(names)) {
      urls[key] = await createTestDatabase(adminUrl!, name);
      const c = await connect(urls[key]);
      await c.query(SUPABASE_SHIM_SQL); // stands in for what Supabase provides
      if (key === 'occupied') await c.query('CREATE TABLE public.unexpected_table (id int)');
      await c.end();
    }
  });

  afterAll(async () => {
    for (const name of Object.values(names)) await dropTestDatabase(adminUrl!, name);
  });

  const tableCount = async (url: string) => {
    const c = await connect(url);
    const n = Number((await c.query(`SELECT count(*) FROM pg_tables WHERE schemaname = 'public'`)).rows[0].count);
    await c.end();
    return n;
  };

  it('refuses a database that already has tables, changing nothing', async () => {
    const { code, out } = run(['--local-rehearsal', urls.occupied], { APPLY_STAGING_CONFIRM: 'APPLY TO STAGING' });
    expect(code).toBe(2);
    expect(out).toMatch(/already has tables in its public schema \(unexpected_table\)/);
    expect(await tableCount(urls.occupied)).toBe(1);
  });

  it('changes nothing unless the confirmation is typed exactly', async () => {
    const { code, out } = run(['--local-rehearsal', urls.cancel], {}, 'yes\n');
    expect(code).toBe(1);
    expect(out).toMatch(/Cancelled. Nothing was changed./);
    expect(await tableCount(urls.cancel)).toBe(0);
  });

  it('initializes an empty database end to end and verifies the result', async () => {
    const { code, out } = run(['--local-rehearsal', urls.fresh], { APPLY_STAGING_CONFIRM: 'APPLY TO STAGING' });
    expect(out).toMatch(/Staging database initialized \(rehearsal\)/);
    expect(code).toBe(0);
    expect(out).toMatch(/tables without row-level security: 0/);
    expect(out).toMatch(/restore function installed: true/);
    expect(out).toMatch(/version columns present: true/);
    expect(out).toMatch(/synthetic employees: 11, non-synthetic emails: 0/);
    expect(out).toMatch(/submitted timecards: 12/);

    const c = await connect(urls.fresh);
    const agencies = await c.query(`SELECT primary_contact_email FROM public.apollo_agencies`);
    expect(agencies.rows.every((r) => String(r.primary_contact_email).endsWith('@example.test'))).toBe(true);
    await c.end();
  });

  it('refuses to run a second time on the initialized database', () => {
    const { code, out } = run(['--local-rehearsal', urls.fresh], { APPLY_STAGING_CONFIRM: 'APPLY TO STAGING' });
    expect(code).toBe(2);
    expect(out).toMatch(/already has tables/);
  });
});
