-- ApolloEMS STAGING ONLY: row-level security for the reconstructed tables.
--
-- !!! NEVER RUN AGAINST PRODUCTION. !!! Production's real policies are not in
-- the repository; these are staging rules written from how the app behaves:
--   * an employee (matched by login email) reads and writes only their own
--     timecard data, and can submit but never review timecards;
--   * active supervisors / admins / GMs read everything and do all reviewing;
--   * signed-out (anon) callers get nothing.

-- Who is signed in, resolved from the login email. SECURITY DEFINER so the
-- lookup itself is not blocked by the employees policy; it returns only the
-- caller's own id / role flag.
CREATE OR REPLACE FUNCTION public.apollo_staging_current_employee_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT e.id
    FROM public.employees e
   WHERE lower(e.email) = lower(coalesce(auth.jwt()->>'email', ''))
     AND coalesce(auth.jwt()->>'email', '') <> ''
     AND lower(e.status) = 'active'
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.apollo_staging_is_supervisor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.employees e
     WHERE lower(e.email) = lower(coalesce(auth.jwt()->>'email', ''))
       AND coalesce(auth.jwt()->>'email', '') <> ''
       AND lower(e.status) = 'active'
       AND (lower(e.role) IN ('supervisor', 'admin', 'gm')
            OR lower(e.job_title) LIKE '%supervisor%'
            OR lower(e.job_title) LIKE '%admin%'
            OR lower(e.job_title) LIKE '%general manager%')
  )
$$;

-- Used by /api/sms/send. SMS is disabled outside production regardless.
CREATE OR REPLACE FUNCTION public.is_authorized_sms_supervisor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT public.apollo_staging_is_supervisor()
$$;

REVOKE ALL ON FUNCTION public.apollo_staging_current_employee_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apollo_staging_is_supervisor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_authorized_sms_supervisor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apollo_staging_current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apollo_staging_is_supervisor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authorized_sms_supervisor() TO authenticated;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'employees', 'submitted_timecards', 'editable_timecard_rows', 'payroll_submissions', 'timecard_notes',
    'timecard_corrections', 'missed_meal_breaks', 'additional_compensation', 'time_punches', 'schedules',
    'schedule_assignments', 'open_shift_requests', 'apollo_messages', 'audit_logs', 'company_announcements',
    'announcement_reads', 'system_config', 'employee_sms_preferences'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;

  -- Employee-owned data: own rows only, plus full supervisor access.
  FOREACH t IN ARRAY ARRAY[
    'editable_timecard_rows', 'timecard_notes', 'timecard_corrections', 'missed_meal_breaks',
    'additional_compensation', 'announcement_reads', 'employee_sms_preferences'
  ] LOOP
    EXECUTE format($p$CREATE POLICY staging_own_rows ON public.%I FOR ALL TO authenticated
      USING (employee_id = public.apollo_staging_current_employee_id() OR public.apollo_staging_is_supervisor())
      WITH CHECK (employee_id = public.apollo_staging_current_employee_id() OR public.apollo_staging_is_supervisor())$p$, t);
  END LOOP;

  -- Shared reference data: everyone signed in reads; supervisors write.
  FOREACH t IN ARRAY ARRAY[
    'employees', 'payroll_submissions', 'schedules', 'schedule_assignments', 'apollo_messages',
    'company_announcements', 'system_config'
  ] LOOP
    EXECUTE format('CREATE POLICY staging_read ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format($p$CREATE POLICY staging_supervisor_write ON public.%I FOR ALL TO authenticated
      USING (public.apollo_staging_is_supervisor()) WITH CHECK (public.apollo_staging_is_supervisor())$p$, t);
  END LOOP;
END $$;

-- Submitted timecards: an employee reads and SUBMITS their own; only
-- supervisors review (update) or remove them.
CREATE POLICY staging_timecards_read ON public.submitted_timecards FOR SELECT TO authenticated
  USING (employee_id = public.apollo_staging_current_employee_id() OR public.apollo_staging_is_supervisor());
CREATE POLICY staging_timecards_submit ON public.submitted_timecards FOR INSERT TO authenticated
  WITH CHECK (
    public.apollo_staging_is_supervisor()
    OR (employee_id = public.apollo_staging_current_employee_id() AND status = 'PENDING_SUPERVISOR_REVIEW')
  );
CREATE POLICY staging_timecards_review ON public.submitted_timecards FOR UPDATE TO authenticated
  USING (public.apollo_staging_is_supervisor()) WITH CHECK (public.apollo_staging_is_supervisor());
CREATE POLICY staging_timecards_remove ON public.submitted_timecards FOR DELETE TO authenticated
  USING (public.apollo_staging_is_supervisor());

-- Clock punches: own rows read-only for employees; supervisors manage.
CREATE POLICY staging_punches_read ON public.time_punches FOR SELECT TO authenticated
  USING (employee_id = public.apollo_staging_current_employee_id() OR public.apollo_staging_is_supervisor());
CREATE POLICY staging_punches_manage ON public.time_punches FOR ALL TO authenticated
  USING (public.apollo_staging_is_supervisor()) WITH CHECK (public.apollo_staging_is_supervisor());

-- Shift requests: employees create and read their own; supervisors decide.
CREATE POLICY staging_requests_own ON public.open_shift_requests FOR ALL TO authenticated
  USING (employee_id = public.apollo_staging_current_employee_id() OR public.apollo_staging_is_supervisor())
  WITH CHECK (employee_id = public.apollo_staging_current_employee_id() OR public.apollo_staging_is_supervisor());

-- Audit log and its entries: supervisors only.
CREATE POLICY staging_audit ON public.audit_logs FOR ALL TO authenticated
  USING (public.apollo_staging_is_supervisor()) WITH CHECK (public.apollo_staging_is_supervisor());

-- The supervisor screen subscribes to apollo_messages changes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'apollo_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.apollo_messages;
  END IF;
END $$;

-- Private storage buckets used by certification uploads and incident
-- attachments (no files are copied; access policies are a known gap).
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public) VALUES
      ('employee-certifications', 'employee-certifications', false),
      ('incident-report-attachments', 'incident-report-attachments', false)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
