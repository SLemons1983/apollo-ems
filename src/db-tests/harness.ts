import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

// Local-only PostgreSQL harness for database tests. Uses synthetic data in
// throwaway databases. It refuses to connect anywhere except this machine, so
// it can never reach Supabase staging or production.

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function getLocalAdminUrl(): string | null {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw) return null;
  const url = new URL(raw);
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`TEST_DATABASE_URL must point to a local PostgreSQL server, not ${url.hostname}.`);
  }
  return raw;
}

export async function connect(url: string): Promise<Client> {
  // Timeouts turn a stuck lock into a test failure instead of a hang.
  const client = new Client({ connectionString: url, options: '-c lock_timeout=15000 -c statement_timeout=20000' });
  await client.connect();
  return client;
}

export async function createTestDatabase(adminUrl: string, name: string): Promise<string> {
  if (!/^apollo_test_[a-z0-9_]+$/.test(name)) throw new Error(`Unsafe test database name: ${name}`);
  const admin = await connect(adminUrl);
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

export async function dropTestDatabase(adminUrl: string, name: string) {
  const admin = await connect(adminUrl);
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  } finally {
    await admin.end();
  }
}

/**
 * Minimal local imitation of the Supabase pieces the SQL relies on: the
 * anon/authenticated/service_role roles and auth.jwt()/auth.uid() reading the
 * request claims that PostgREST sets for each request.
 */
export const SUPABASE_SHIM_SQL = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(auth.jwt()->>'sub', '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
`;

export function readMigration(fileName: string): string {
  return readFileSync(path.resolve(__dirname, '../../supabase/migrations', fileName), 'utf8');
}

export type Claims = { email: string; sub?: string };

/** Starts a transaction as an authenticated user, the way PostgREST does. */
export async function beginAsUser(client: Client, claims: Claims) {
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE authenticated');
  await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: 'authenticated', ...claims })]);
}

export async function asUser<T>(client: Client, claims: Claims, fn: () => Promise<T>): Promise<T> {
  await beginAsUser(client, claims);
  try {
    const result = await fn();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

/** Resolves to 'pending' if the promise has not settled within `ms`. */
export async function settledWithin<T>(promise: Promise<T>, ms: number): Promise<'pending' | 'settled'> {
  return Promise.race([
    promise.then(
      () => 'settled' as const,
      () => 'settled' as const,
    ),
    new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), ms)),
  ]);
}
