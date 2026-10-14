-- ApolloEMS PRODUCTION release readiness: READ-ONLY.
--
-- Paste into the production project's SQL Editor and run. It is ONE SELECT
-- statement: it reads the catalog and counts rows, and cannot change anything.
-- It returns no names, emails, hours or other employee data, only counts and
-- schema details. Policy text (section 5) can contain email addresses written
-- into a policy; redact them before sharing if so.
--
-- Columns of the result: section | item | detail | status
--   status: PASS, FAIL (blocks the release) or INFO (for review).

WITH
tables(t) AS (VALUES ('submitted_timecards'), ('editable_timecard_rows'), ('payroll_submissions')),
version_cols(c) AS (VALUES ('version_number'), ('parent_timecard_id'), ('version_reason'), ('created_by_role'), ('created_by_employee_id')),
restore_cols(c) AS (VALUES ('id'), ('employee_id'), ('pay_period_key'), ('date_key'), ('row_data'), ('updated_at')),
has_version_cols AS (
  SELECT count(*) = 5 AS ok FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'submitted_timecards'
     AND column_name IN (SELECT c FROM version_cols)
),
has_restore_cols AS (
  SELECT count(*) = 6 AS ok FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'editable_timecard_rows'
     AND column_name IN (SELECT c FROM restore_cols)
),
-- Runs a count only when the columns it needs exist (never errors).
counted(section, item, sql, needs_version, needs_restore) AS (VALUES
  ('7 data', 'submitted_timecards: total rows',
     'select count(*) as n from public.submitted_timecards', false, false),
  ('7 data', 'submitted_timecards: rows without version_number (legacy, read as version 1)',
     'select count(*) as n from public.submitted_timecards where version_number is null', true, false),
  ('7 data', 'submitted_timecards: employee+period groups with more than one APPROVED row (packet now shows only the current one)',
     'select count(*) as n from (select 1 from public.submitted_timecards where upper(status::text) = ''APPROVED'' group by employee_id, pay_period_key having count(*) > 1) g', false, false),
  ('7 data', 'submitted_timecards: employee+period groups with more than one row (resubmission history)',
     'select count(*) as n from (select 1 from public.submitted_timecards group by employee_id, pay_period_key having count(*) > 1) g', false, false),
  ('7 data', 'editable_timecard_rows: total rows',
     'select count(*) as n from public.editable_timecard_rows', false, true),
  ('7 data', 'editable_timecard_rows: updated_at values that are not ISO timestamps (must be 0)',
     'select count(*) as n from public.editable_timecard_rows where updated_at is not null and updated_at::text !~ ''^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}''', false, true),
  ('7 data', 'editable_timecard_rows: ids not starting with employee_id-pay_period_key- (restore ignores these)',
     'select count(*) as n from public.editable_timecard_rows where left(id::text, length(employee_id::text || ''-'' || pay_period_key::text || ''-'')) <> employee_id::text || ''-'' || pay_period_key::text || ''-''', false, true),
  ('7 data', 'editable_timecard_rows: existing restore marker rows',
     'select count(*) as n from public.editable_timecard_rows where id::text like ''%-restore-marker-%''', false, true),
  ('7 data', 'submitted_timecards: RETURNED rows without reviewed_at (cannot be restored automatically; employee re-enters)',
     'select count(*) as n from public.submitted_timecards where upper(status::text) = ''RETURNED'' and reviewed_at is null', false, false),
  ('7 data', 'payroll_submissions: finalized periods',
     'select count(*) as n from public.payroll_submissions', false, false)
)

SELECT section, item, detail, status FROM (

  -- 1. Server
  SELECT '1 server' AS section, 'PostgreSQL version' AS item, current_setting('server_version') AS detail, 'INFO' AS status
  UNION ALL
  SELECT '1 server', 'hashtextextended and pg_advisory_xact_lock available',
         (to_regprocedure('hashtextextended(text,bigint)') IS NOT NULL AND to_regprocedure('pg_advisory_xact_lock(bigint)') IS NOT NULL)::text,
         CASE WHEN to_regprocedure('hashtextextended(text,bigint)') IS NOT NULL AND to_regprocedure('pg_advisory_xact_lock(bigint)') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT '1 server', 'role "authenticated" exists and may use schema public',
         (EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') AND has_schema_privilege('authenticated', 'public', 'USAGE'))::text,
         CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') AND has_schema_privilege('authenticated', 'public', 'USAGE') THEN 'PASS' ELSE 'FAIL' END

  -- 1b. Sign-in to employee mapping used by the restore function:
  --     auth.uid() -> auth.users.email -> exactly one employees row (case-insensitive)
  UNION ALL
  SELECT '1 identity', 'auth.uid() and auth.users exist; the migration owner (current user) may read auth.users',
         format('auth.uid=%s auth.users=%s readable=%s', to_regprocedure('auth.uid()') IS NOT NULL,
                to_regclass('auth.users') IS NOT NULL,
                to_regclass('auth.users') IS NOT NULL AND has_table_privilege(current_user, 'auth.users', 'SELECT')),
         CASE WHEN to_regprocedure('auth.uid()') IS NOT NULL AND to_regclass('auth.users') IS NOT NULL
               AND has_table_privilege(current_user, 'auth.users', 'SELECT') THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT '1 identity', 'employees.id and employees.email columns (types)',
         coalesce(string_agg(column_name || '=' || data_type, ', ' ORDER BY column_name), 'missing'),
         CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'employees' AND column_name IN ('id', 'email')
  UNION ALL
  SELECT '1 identity', 'email addresses shared by more than one employee profile (those users cannot restore; INFO)',
         count(*)::text, 'INFO'
    FROM (SELECT 1 FROM public.employees WHERE coalesce(btrim(email), '') <> ''
           GROUP BY lower(btrim(email)) HAVING count(*) > 1) d
  UNION ALL
  SELECT '1 identity', 'sign-in accounts whose email matches exactly one employee / total sign-in accounts',
         format('%s / %s',
                (SELECT count(*) FROM auth.users u
                  WHERE (SELECT count(*) FROM public.employees e WHERE lower(btrim(e.email)) = lower(btrim(u.email))) = 1),
                (SELECT count(*) FROM auth.users)),
         'INFO'

  -- 2. Columns the release depends on
  UNION ALL
  SELECT '2 columns', 'submitted_timecards: the five version columns present',
         (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'submitted_timecards'
             AND column_name IN (SELECT c FROM version_cols))::text || ' of 5',
         CASE WHEN (SELECT ok FROM has_version_cols) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT '2 columns', 'editable_timecard_rows: the six columns the restore function writes',
         (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'editable_timecard_rows'
             AND column_name IN (SELECT c FROM restore_cols))::text || ' of 6',
         CASE WHEN (SELECT ok FROM has_restore_cols) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT '2 columns', c.table_name || '.' || c.column_name,
         format('%s, nullable=%s, default=%s', c.data_type, c.is_nullable, coalesce(c.column_default, 'none')),
         'INFO'
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND (c.table_name IN ('editable_timecard_rows', 'payroll_submissions')
          OR (c.table_name = 'submitted_timecards'
              AND c.column_name IN ('id', 'employee_id', 'pay_period_key', 'status', 'submitted_at', 'reviewed_at',
                                    'version_number', 'parent_timecard_id', 'version_reason', 'created_by_role', 'created_by_employee_id')))
  UNION ALL
  SELECT '2 columns', 'editable_timecard_rows: other NOT NULL columns without a default (must be none)',
         coalesce(string_agg(column_name, ', '), 'none'),
         CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'editable_timecard_rows'
     AND is_nullable = 'NO' AND column_default IS NULL AND is_identity = 'NO' AND is_generated = 'NEVER'
     AND column_name NOT IN (SELECT c FROM restore_cols)
  UNION ALL
  SELECT '2 columns', 'submitted_timecards: version_number is integer-like, the four others text-like',
         coalesce(string_agg(column_name || '=' || data_type, ', ' ORDER BY column_name), 'columns missing'),
         CASE WHEN count(*) = 5 AND bool_and(
               (column_name = 'version_number' AND data_type IN ('integer', 'bigint', 'smallint', 'numeric'))
            OR (column_name <> 'version_number' AND data_type IN ('text', 'character varying'))) THEN 'PASS' ELSE 'FAIL' END
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'submitted_timecards' AND column_name IN (SELECT c FROM version_cols)

  -- 3. Keys and constraints
  UNION ALL
  SELECT '3 constraints', 'editable_timecard_rows: primary key or unique constraint on (id) (required)',
         coalesce(string_agg(conname, ', '), 'none'),
         CASE WHEN count(*) > 0 THEN 'PASS' ELSE 'FAIL' END
    FROM pg_constraint
   WHERE conrelid = to_regclass('public.editable_timecard_rows') AND contype IN ('p', 'u')
     AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = to_regclass('public.editable_timecard_rows') AND attname = 'id')]
  UNION ALL
  SELECT '3 constraints', 'submitted_timecards: primary key or unique constraint on (id)',
         coalesce(string_agg(conname, ', '), 'none'),
         CASE WHEN count(*) > 0 THEN 'PASS' ELSE 'FAIL' END
    FROM pg_constraint
   WHERE conrelid = to_regclass('public.submitted_timecards') AND contype IN ('p', 'u')
     AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = to_regclass('public.submitted_timecards') AND attname = 'id')]
  UNION ALL
  SELECT '3 constraints', conrelid::regclass::text || ': ' || conname,
         pg_get_constraintdef(oid),
         'INFO'
    FROM pg_constraint
   WHERE conrelid IN (SELECT to_regclass('public.' || t) FROM tables) AND contype IN ('c', 'f', 'u', 'x')

  -- 4. Row-level security and table privileges
  UNION ALL
  SELECT '4 security', c.relname || ': row-level security enabled',
         format('enabled=%s forced=%s', c.relrowsecurity, c.relforcerowsecurity),
         CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'FAIL' END
    FROM pg_class c WHERE c.oid IN (SELECT to_regclass('public.' || t) FROM tables)
  UNION ALL
  SELECT '4 security', format('%s: %s privileges', t, r),
         format('select=%s insert=%s update=%s delete=%s',
                has_table_privilege(r, 'public.' || t, 'SELECT'), has_table_privilege(r, 'public.' || t, 'INSERT'),
                has_table_privilege(r, 'public.' || t, 'UPDATE'), has_table_privilege(r, 'public.' || t, 'DELETE')),
         'INFO'
    FROM tables, (VALUES ('authenticated'), ('anon')) roles(r)
   WHERE to_regclass('public.' || t) IS NOT NULL
  UNION ALL
  SELECT '4 security', 'authenticated may INSERT the five version columns into submitted_timecards',
         coalesce(string_agg(c, ', ') FILTER (WHERE NOT has_column_privilege('authenticated', 'public.submitted_timecards', c, 'INSERT')), 'all allowed'),
         CASE WHEN bool_and(has_column_privilege('authenticated', 'public.submitted_timecards', c, 'INSERT')) THEN 'PASS' ELSE 'FAIL' END
    FROM version_cols WHERE (SELECT ok FROM has_version_cols)
  UNION ALL
  SELECT '4 security', 'authenticated may INSERT and UPDATE editable_timecard_rows (restore runs as the employee)',
         format('insert=%s update=%s', has_table_privilege('authenticated', 'public.editable_timecard_rows', 'INSERT'),
                has_table_privilege('authenticated', 'public.editable_timecard_rows', 'UPDATE')),
         CASE WHEN has_table_privilege('authenticated', 'public.editable_timecard_rows', 'INSERT')
               AND has_table_privilege('authenticated', 'public.editable_timecard_rows', 'UPDATE') THEN 'PASS' ELSE 'FAIL' END
   WHERE to_regclass('public.editable_timecard_rows') IS NOT NULL

  -- 5. Policies (review: employees must be able to insert their own submitted_timecards
  --    rows with the version columns, read/write their own editable rows, and read
  --    payroll_submissions; supervisors must read/update all timecards)
  UNION ALL
  SELECT '5 policies', format('%s: %s [%s] to %s', tablename, policyname, cmd, array_to_string(roles, ',')),
         format('%s using: %s | check: %s', permissive, coalesce(qual, '-'), coalesce(with_check, '-')),
         'INFO'
    FROM pg_policies WHERE schemaname = 'public' AND tablename IN (SELECT t FROM tables)

  UNION ALL
  SELECT '7 data', 'submitted_timecards: status values in use (the workflow expects PENDING_SUPERVISOR_REVIEW, APPROVED, RETURNED)',
         coalesce(string_agg(format('%s=%s', status, n), ', ' ORDER BY status), 'no rows'), 'INFO'
    FROM (SELECT coalesce(status::text, 'NULL') AS status, count(*) AS n FROM public.submitted_timecards GROUP BY 1) st

  -- 6. Triggers and functions
  UNION ALL
  SELECT '6 triggers', tgrelid::regclass::text || ': ' || tgname,
         pg_get_triggerdef(oid), 'INFO'
    FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (SELECT to_regclass('public.' || t) FROM tables)
  UNION ALL
  SELECT '6 functions', 'existing functions named restore_returned_timecard_rows (expected none before the migration)',
         coalesce(string_agg(p.oid::regprocedure::text, ', '), 'none'),
         CASE WHEN count(*) = 0 THEN 'PASS'
              WHEN bool_and(p.oid = to_regprocedure('public.restore_returned_timecard_rows(text,text,text,timestamptz,text,jsonb)')) THEN 'INFO'
              ELSE 'FAIL' END
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'restore_returned_timecard_rows'

  -- 7. Data shape (counts only; section '7 data')
  UNION ALL
  SELECT k.section, k.item, coalesce(v.n, 'skipped (columns missing)'),
         CASE WHEN k.item NOT LIKE '%(must be 0)' THEN 'INFO' WHEN v.n = '0' THEN 'PASS' ELSE 'FAIL' END
    FROM counted k
    CROSS JOIN LATERAL (
      SELECT CASE WHEN (k.needs_version AND NOT (SELECT ok FROM has_version_cols))
                    OR (k.needs_restore AND NOT (SELECT ok FROM has_restore_cols))
                  THEN NULL
                  ELSE (xpath('/row/n/text()', query_to_xml(k.sql, false, true, '')))[1]::text END AS n
    ) v
   WHERE to_regclass('public.' || split_part(k.item, ':', 1)) IS NOT NULL
) checks
ORDER BY section, status = 'INFO', item;
