-- ApolloEMS STAGING: read-only verification. Paste into the staging project's
-- SQL Editor (project eejahcuftznsabulssew) and run. It changes nothing: the
-- whole script runs in a READ ONLY transaction that is rolled back.
BEGIN READ ONLY;

SELECT check_name, result, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
  SELECT 'tables without row-level security' AS check_name,
         coalesce(string_agg(tablename, ', '), 'none') AS result,
         count(*) = 0 AS ok
    FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity
  UNION ALL
  SELECT 'timecard tables signed-out (anon) users can read',
         coalesce(string_agg(table_name, ', '), 'none'), count(*) = 0
    FROM information_schema.role_table_grants
   WHERE grantee = 'anon' AND table_schema = 'public' AND privilege_type = 'SELECT'
     AND table_name IN ('employees','submitted_timecards','editable_timecard_rows','payroll_submissions','time_punches')
  UNION ALL
  SELECT 'restore function: SECURITY DEFINER, authenticated may run it, anon may not',
         format('definer=%s authenticated=%s anon=%s', p.prosecdef,
                has_function_privilege('authenticated', p.oid, 'EXECUTE'), has_function_privilege('anon', p.oid, 'EXECUTE')),
         p.prosecdef AND has_function_privilege('authenticated', p.oid, 'EXECUTE') AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    FROM pg_proc p WHERE p.oid = to_regprocedure('public.restore_returned_timecard_rows(text,text,text,timestamptz,text,jsonb)')
  UNION ALL
  SELECT 'version columns on submitted_timecards', count(*)::text || ' of 5', count(*) = 5
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'submitted_timecards'
     AND column_name IN ('version_number','parent_timecard_id','version_reason','created_by_role','created_by_employee_id')
  UNION ALL
  SELECT 'staging policies on submitted_timecards', count(*)::text, count(*) = 4
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'submitted_timecards'
  UNION ALL
  SELECT 'employees with non-synthetic emails (testers you added are expected here)',
         coalesce(string_agg(id, ', '), 'none'), bool_and(id LIKE 'emp-stg-tester-%') IS NOT FALSE
    FROM public.employees WHERE email NOT LIKE '%@example.test' AND email NOT LIKE '%@removed.example.test'
  UNION ALL
  SELECT 'agency contact emails are synthetic',
         coalesce(string_agg(primary_contact_email, ', ') FILTER (WHERE primary_contact_email NOT LIKE '%@example.test'), 'yes'),
         count(*) FILTER (WHERE primary_contact_email NOT LIKE '%@example.test') = 0
    FROM public.apollo_agencies
  UNION ALL
  SELECT 'finalized payroll periods', coalesce(string_agg(pay_period_key, ', '), 'none'), true FROM public.payroll_submissions
  UNION ALL
  SELECT 'apollo_messages in realtime publication',
         (EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'apollo_messages'))::text,
         EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'apollo_messages')
  UNION ALL
  SELECT 'private storage buckets',
         coalesce((SELECT string_agg(id || CASE WHEN public THEN ' (PUBLIC!)' ELSE '' END, ', ') FROM storage.buckets), 'none'),
         NOT EXISTS (SELECT 1 FROM storage.buckets WHERE public)
) checks;

ROLLBACK;
