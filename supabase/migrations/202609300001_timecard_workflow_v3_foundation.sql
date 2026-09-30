-- ApolloEMS Timecard Workflow V3
-- Patch 001: database foundation for immutable timecard versions,
-- supervisor edits, employee re-acknowledgement, and audit trail.
--
-- This migration is intentionally additive. It does not rewrite or delete
-- existing submitted_timecards rows.

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS version_number integer;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS parent_timecard_id text;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS version_reason text;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS created_by_role text;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS created_by_employee_id text;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS supervisor_edit_at timestamptz;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS supervisor_edit_by text;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS supervisor_edit_comment text;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS employee_review_required boolean NOT NULL DEFAULT false;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS employee_reviewed_at timestamptz;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS employee_reviewed_by text;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS employee_review_acknowledgement jsonb;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS signature_text text;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS signature_at timestamptz;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS signature_ip inet;

ALTER TABLE public.submitted_timecards
  ADD COLUMN IF NOT EXISTS signature_user_agent text;

UPDATE public.submitted_timecards
SET version_number = 1
WHERE version_number IS NULL;

UPDATE public.submitted_timecards
SET created_by_role = 'EMPLOYEE'
WHERE created_by_role IS NULL;

CREATE INDEX IF NOT EXISTS submitted_timecards_employee_period_idx
  ON public.submitted_timecards (employee_id, pay_period_key, submitted_at DESC);

CREATE INDEX IF NOT EXISTS submitted_timecards_parent_idx
  ON public.submitted_timecards (parent_timecard_id);

CREATE INDEX IF NOT EXISTS submitted_timecards_review_required_idx
  ON public.submitted_timecards (employee_review_required)
  WHERE employee_review_required = true;
