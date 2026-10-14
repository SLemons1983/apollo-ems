-- ApolloEMS STAGING ONLY: reconstructed base schema.
--
-- !!! NEVER RUN AGAINST PRODUCTION (project xyrusrspvyuwpplhhett). !!!
--
-- These tables exist in production but were created outside the repository's
-- migrations, so their real definitions are unknown. Everything below is
-- RECONSTRUCTED FROM APPLICATION CODE (every column the app reads or writes),
-- choosing types that accept exactly what the app sends. It is good enough to
-- exercise the timecard workflow in staging; it is NOT a verified copy of
-- production. Unknowns are listed in supabase/staging/README.md.
--
-- Apply order: this file, then every file in supabase/migrations/ in name
-- order, then 002_staging_access_rules.sql, then 003_synthetic_seed.sql.

-- Safety stop: this script only runs on an EMPTY database. Production already
-- has these tables, so pointing this file at production fails here, before
-- any change is made.
DO $$
DECLARE
  existing text;
BEGIN
  SELECT string_agg(tablename, ', ') INTO existing
    FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename IN ('employees', 'submitted_timecards', 'editable_timecard_rows', 'payroll_submissions',
                       'schedule_assignments', 'time_punches', 'apollo_messages');
  IF existing IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to run: tables already exist (%). This script is only for an empty staging database.', existing;
  END IF;
END $$;

CREATE TABLE public.employees (
  id text PRIMARY KEY,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'BLS',
  job_title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active',
  employee_type text NOT NULL DEFAULT '',
  seniority_label text NOT NULL DEFAULT 'Seniority Unassigned',
  certifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  photo_url text,
  last_login_at timestamptz,
  auth_provider text
);
CREATE INDEX employees_email_lower_idx ON public.employees (lower(email));

CREATE TABLE public.submitted_timecards (
  id text PRIMARY KEY,
  employee_id text NOT NULL,
  employee_name text NOT NULL DEFAULT '',
  pay_period_key text NOT NULL,
  pay_period_start text NOT NULL,
  pay_period_end text NOT NULL,
  submitted_at timestamptz NOT NULL,
  total_hours numeric NOT NULL DEFAULT 0,
  pay_breakdown jsonb,
  punches jsonb NOT NULL DEFAULT '[]'::jsonb,
  missed_meal_breaks jsonb NOT NULL DEFAULT '[]'::jsonb,
  corrections jsonb NOT NULL DEFAULT '[]'::jsonb,
  additional_compensation jsonb NOT NULL DEFAULT '[]'::jsonb,
  submission_acknowledgement jsonb,
  note text NOT NULL DEFAULT '',
  status text NOT NULL,
  supervisor_comment text,
  reviewed_at timestamptz,
  reviewed_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
  -- version, signature and supervisor-edit columns are added by
  -- supabase/migrations/202609300001_timecard_workflow_v3_foundation.sql.
);

CREATE TABLE public.editable_timecard_rows (
  id text PRIMARY KEY,
  employee_id text NOT NULL,
  pay_period_key text NOT NULL,
  date_key text,
  row_data jsonb,
  updated_at timestamptz
);
CREATE INDEX editable_timecard_rows_employee_period_idx
  ON public.editable_timecard_rows (employee_id, pay_period_key);

CREATE TABLE public.payroll_submissions (
  pay_period_key text PRIMARY KEY,
  submitted_by text NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approved_timecards integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.timecard_notes (
  id text PRIMARY KEY,
  employee_id text NOT NULL,
  pay_period_key text NOT NULL,
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.timecard_corrections (
  id text PRIMARY KEY,
  employee_id text NOT NULL,
  pay_period_key text NOT NULL,
  date_key text NOT NULL,
  shift_label text NOT NULL DEFAULT '',
  correction_type text NOT NULL,
  requested_date text,
  requested_time text,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.missed_meal_breaks (
  id text PRIMARY KEY,
  employee_id text NOT NULL,
  date_key text NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.additional_compensation (
  id text PRIMARY KEY,
  employee_id text NOT NULL,
  date_key text NOT NULL,
  compensation_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.time_punches (
  id text PRIMARY KEY,
  employee_id text NOT NULL,
  type text NOT NULL,
  "timestamp" timestamptz NOT NULL,
  shift_date_key text,
  shift_label text,
  location_label text,
  latitude double precision,
  longitude double precision,
  distance_feet numeric,
  geofence_status text
);

CREATE TABLE public.schedules (
  id text PRIMARY KEY,
  date_key text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.schedule_assignments (
  id text PRIMARY KEY,
  schedule_id text,
  date_key text NOT NULL,
  shift_key text NOT NULL,
  shift_label text NOT NULL DEFAULT '',
  slot_number integer NOT NULL DEFAULT 0,
  employee_id text,
  start_time text,
  end_time text,
  held_over boolean NOT NULL DEFAULT false,
  holdover_reason text,
  note text NOT NULL DEFAULT '',
  shift_type text NOT NULL DEFAULT 'REGULAR',
  vehicle text NOT NULL DEFAULT '',
  allow_extended_hours boolean NOT NULL DEFAULT false,
  hidden_from_employees boolean NOT NULL DEFAULT false,
  is_open_slot boolean NOT NULL DEFAULT false,
  open_slot_scope text,
  updated_at timestamptz NOT NULL DEFAULT now()
  -- cardiac_monitor is added by 202608260001_schedule_request_comments_and_cardiac_monitors.sql.
);

CREATE TABLE public.open_shift_requests (
  id text PRIMARY KEY,
  employee_id text NOT NULL,
  employee_name text NOT NULL DEFAULT '',
  date_key text NOT NULL,
  shift_key text,
  shift_label text,
  pay_period_key text,
  status text NOT NULL DEFAULT 'PENDING',
  supervisor_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.apollo_messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL,
  sender_id text NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  sender_role text NOT NULL DEFAULT '',
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience_label text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  related_type text,
  related_id text,
  priority text NOT NULL DEFAULT 'NORMAL',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id text PRIMARY KEY,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL DEFAULT '',
  action text NOT NULL,
  details text NOT NULL DEFAULT ''
);

CREATE TABLE public.company_announcements (
  id text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  posted_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.announcement_reads (
  id text PRIMARY KEY,
  employee_id text NOT NULL,
  announcement_id text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.system_config (
  id text PRIMARY KEY,
  company_name text NOT NULL DEFAULT 'ApolloEMS',
  logo_data_url text,
  important_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  geofences jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_sms_preferences (
  employee_id text PRIMARY KEY,
  employee_email text NOT NULL DEFAULT '',
  phone_e164 text NOT NULL DEFAULT '',
  sms_enabled boolean NOT NULL DEFAULT false,
  notify_announcements boolean NOT NULL DEFAULT true,
  notify_messages boolean NOT NULL DEFAULT true,
  notify_shift_requests boolean NOT NULL DEFAULT true,
  notify_shift_trades boolean NOT NULL DEFAULT true,
  notify_certifications boolean NOT NULL DEFAULT true,
  notify_timecards boolean NOT NULL DEFAULT true,
  notify_supervisor_messages boolean NOT NULL DEFAULT true,
  consented_at timestamptz,
  consent_version text,
  consent_source text,
  opted_out_at timestamptz,
  opt_out_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
