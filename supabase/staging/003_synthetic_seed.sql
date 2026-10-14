-- ApolloEMS STAGING ONLY: synthetic test data. Every person, email and record
-- below is fictional (@example.test). Never run against production.
--
-- Pay periods (America/Los_Angeles): 2026-pp-20 Sep 13-26 (payroll finalized),
-- 2026-pp-21 Sep 27-Oct 10 (previous period, review in progress),
-- 2026-pp-22 Oct 11-24 (current period).
--
-- To sign in to staging with your own Google account as a test supervisor,
-- add ONE row afterwards, e.g.:
--   INSERT INTO public.employees (id, first_name, last_name, email, role, job_title, status, scope, employee_type)
--   VALUES ('emp-stg-tester', 'Staging', 'Tester', '<your login email>', 'Supervisor', 'Supervisor', 'Active', 'ALS', 'Full Time');

-- Builds the punches array exactly as the dashboard does for one shift row.
CREATE FUNCTION pg_temp.shift(p_employee text, p_period text, p_date text, p_in timestamptz, p_out timestamptz, p_label text DEFAULT 'R1')
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_array(
    jsonb_build_object('id', 'editable-clock-in-' || p_employee || '-' || p_period || '-' || p_date, 'employeeId', p_employee,
      'type', 'CLOCK_IN', 'timestamp', to_char(p_in AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'shiftDateKey', p_date, 'shiftLabel', p_label, 'payType', 'DAILY_OT_DT', 'locationLabel', 'Employee edited timecard',
      'latitude', null, 'longitude', null, 'distanceFeet', null, 'geofenceStatus', 'LOCATION_UNAVAILABLE'),
    jsonb_build_object('id', 'editable-clock-out-' || p_employee || '-' || p_period || '-' || p_date, 'employeeId', p_employee,
      'type', 'CLOCK_OUT', 'timestamp', to_char(p_out AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'shiftDateKey', p_date, 'shiftLabel', p_label, 'payType', 'DAILY_OT_DT', 'locationLabel', 'Employee edited timecard',
      'latitude', null, 'longitude', null, 'distanceFeet', null, 'geofenceStatus', 'LOCATION_UNAVAILABLE'))
$$;

CREATE FUNCTION pg_temp.ack(p_employee text, p_name text, p_action text, p_at timestamptz)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('employeeId', p_employee, 'employeeName', p_name, 'acceptedAt', p_at,
    'submissionAction', p_action, 'certificationText', 'Synthetic staging certification.')
$$;

CREATE FUNCTION pg_temp.hours(p_total numeric)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('regularHours', p_total, 'overtimeHours', 0, 'doubleTimeHours', 0,
    'holidayPremiumHours', 0, 'missedMealPenaltyHours', 0,
    'week1', jsonb_build_object('regularHours', p_total, 'overtimeHours', 0, 'doubleTimeHours', 0),
    'week2', jsonb_build_object('regularHours', 0, 'overtimeHours', 0, 'doubleTimeHours', 0))
$$;

INSERT INTO public.employees (id, first_name, last_name, email, role, scope, job_title, status, employee_type) VALUES
  ('emp-stg-gm',      'Jordan', 'Ellis',      'jordan.ellis@example.test',      'GM',         'ALS', 'General Manager', 'Active', 'Full Time'),
  ('emp-stg-sup-1',   'Morgan', 'Reyes',      'morgan.reyes@example.test',      'Supervisor', 'ALS', 'Field Supervisor', 'Active', 'Full Time'),
  ('emp-stg-sup-2',   'Quinn',  'Harper',     'quinn.harper@example.test',      'Supervisor', 'ALS', 'Field Supervisor', 'Active', 'Full Time'),
  ('emp-stg-emt-1',   'Avery',  'Chen',       'avery.chen@example.test',        'EMT',        'BLS', 'EMT',             'Active', 'Full Time'),
  ('emp-stg-emt-2',   'Riley',  'Okafor',     'riley.okafor@example.test',      'EMT',        'BLS', 'EMT',             'Active', 'Per Diem'),
  ('emp-stg-emt-3',   'Casey',  'Novak',      'casey.novak@example.test',       'EMT',        'BLS', 'EMT',             'Active', 'Full Time'),
  ('emp-stg-medic-1', 'Taylor', 'Brooks',     'taylor.brooks@example.test',     'Paramedic',  'ALS', 'Paramedic',       'Active', 'Full Time'),
  ('emp-stg-medic-2', 'Drew',   'Patel',      'drew.patel@example.test',        'Paramedic',  'ALS', 'Paramedic',       'Active', 'Per Diem'),
  ('emp-stg-medic-3', 'Jamie',  'Ortiz-Lane', 'jamie.ortiz-lane@example.test',  'Paramedic',  'ALS', 'Paramedic',       'Active', 'Full Time'),
  ('emp-stg-emt-4',   'José',   'Álvarez',    'jose.alvarez@example.test',      'EMT',        'BLS', 'EMT',             'Active', 'Per Diem'),
  ('emp-stg-former',  'Former', 'Employee',   'former.employee@example.test',   'EMT',        'BLS', 'EMT',             'Removed', 'Per Diem');

INSERT INTO public.system_config (id, company_name) VALUES ('default', 'ApolloEMS Staging');
INSERT INTO public.company_announcements (id, title, message, expires_at, posted_by) VALUES
  ('announcement-staging-welcome', 'Staging environment', 'All data here is synthetic.', '2027-01-01T00:00:00Z', 'ApolloEMS Staging');

-- 2026-pp-20: finalized. Avery has a HISTORICAL DUPLICATE APPROVAL (an old
-- copy and its corrected replacement were both approved under the old code).
INSERT INTO public.submitted_timecards
  (id, employee_id, employee_name, pay_period_key, pay_period_start, pay_period_end, submitted_at, total_hours,
   pay_breakdown, punches, submission_acknowledgement, status, reviewed_at, reviewed_by, version_number, parent_timecard_id, created_by_role)
VALUES
  ('stg-pp20-avery-v1', 'emp-stg-emt-1', 'Chen, Avery', '2026-pp-20', '2026-09-13T07:00:00.000Z', '2026-09-26T07:00:00.000Z',
   '2026-09-27T16:00:00Z', 24, pg_temp.hours(24), pg_temp.shift('emp-stg-emt-1', '2026-pp-20', '2026-09-15', '2026-09-15T14:00:00Z', '2026-09-16T14:00:00Z'),
   pg_temp.ack('emp-stg-emt-1', 'Chen, Avery', 'SUBMITTED', '2026-09-27T16:00:00Z'), 'APPROVED', '2026-09-28T16:00:00Z', 'Reyes, Morgan', 1, NULL, 'EMPLOYEE'),
  ('stg-pp20-avery-v2', 'emp-stg-emt-1', 'Chen, Avery', '2026-pp-20', '2026-09-13T07:00:00.000Z', '2026-09-26T07:00:00.000Z',
   '2026-09-28T18:00:00Z', 23.5, pg_temp.hours(23.5), pg_temp.shift('emp-stg-emt-1', '2026-pp-20', '2026-09-15', '2026-09-15T14:30:00Z', '2026-09-16T14:00:00Z'),
   pg_temp.ack('emp-stg-emt-1', 'Chen, Avery', 'SUBMITTED', '2026-09-27T16:00:00Z'), 'APPROVED', '2026-09-28T19:00:00Z', 'Reyes, Morgan', 2, 'stg-pp20-avery-v1', 'SUPERVISOR'),
  ('stg-pp20-taylor-v1', 'emp-stg-medic-1', 'Brooks, Taylor', '2026-pp-20', '2026-09-13T07:00:00.000Z', '2026-09-26T07:00:00.000Z',
   '2026-09-27T17:00:00Z', 48, pg_temp.hours(48), pg_temp.shift('emp-stg-medic-1', '2026-pp-20', '2026-09-17', '2026-09-17T14:00:00Z', '2026-09-18T14:00:00Z'),
   pg_temp.ack('emp-stg-medic-1', 'Brooks, Taylor', 'SUBMITTED', '2026-09-27T17:00:00Z'), 'APPROVED', '2026-09-28T16:30:00Z', 'Reyes, Morgan', 1, NULL, 'EMPLOYEE');

INSERT INTO public.payroll_submissions (pay_period_key, submitted_by, submitted_at, approved_timecards)
VALUES ('2026-pp-20', 'Reyes, Morgan', '2026-09-29T17:00:00Z', 2);

-- 2026-pp-21: one employee in every workflow state.
INSERT INTO public.submitted_timecards
  (id, employee_id, employee_name, pay_period_key, pay_period_start, pay_period_end, submitted_at, total_hours,
   pay_breakdown, punches, submission_acknowledgement, status, supervisor_comment, reviewed_at, reviewed_by,
   version_number, parent_timecard_id, version_reason, created_by_role)
VALUES
  -- Avery: first submission waiting for review.
  ('stg-pp21-avery-v1', 'emp-stg-emt-1', 'Chen, Avery', '2026-pp-21', '2026-09-27T07:00:00.000Z', '2026-10-10T07:00:00.000Z',
   '2026-10-11T16:00:00Z', 24, pg_temp.hours(24), pg_temp.shift('emp-stg-emt-1', '2026-pp-21', '2026-09-29', '2026-09-29T14:00:00Z', '2026-09-30T14:00:00Z'),
   pg_temp.ack('emp-stg-emt-1', 'Chen, Avery', 'SUBMITTED', '2026-10-11T16:00:00Z'), 'PENDING_SUPERVISOR_REVIEW', NULL, NULL, NULL, 1, NULL, 'EMPLOYEE_SUBMISSION', 'EMPLOYEE'),
  -- Riley: returned for correction; editable rows below (restore scenario).
  ('stg-pp21-riley-v1', 'emp-stg-emt-2', 'Okafor, Riley', '2026-pp-21', '2026-09-27T07:00:00.000Z', '2026-10-10T07:00:00.000Z',
   '2026-10-11T17:00:00Z', 12, pg_temp.hours(12), pg_temp.shift('emp-stg-emt-2', '2026-pp-21', '2026-10-02', '2026-10-02T14:00:00Z', '2026-10-03T02:00:00Z'),
   pg_temp.ack('emp-stg-emt-2', 'Okafor, Riley', 'SUBMITTED', '2026-10-11T17:00:00Z'), 'RETURNED', 'Clock-out on Oct 2 looks early; please check.', '2026-10-12T16:00:00Z', 'Reyes, Morgan', 1, NULL, 'EMPLOYEE_SUBMISSION', 'EMPLOYEE'),
  -- Casey: THE ORIGINAL DEADLOCK. Supervisor edit (v2) was returned, then the
  -- employee resubmitted with the old code (no version, no parent).
  ('stg-pp21-casey-v1', 'emp-stg-emt-3', 'Novak, Casey', '2026-pp-21', '2026-09-27T07:00:00.000Z', '2026-10-10T07:00:00.000Z',
   '2026-10-11T15:00:00Z', 24, pg_temp.hours(24), pg_temp.shift('emp-stg-emt-3', '2026-pp-21', '2026-10-01', '2026-10-01T14:00:00Z', '2026-10-02T14:00:00Z'),
   pg_temp.ack('emp-stg-emt-3', 'Novak, Casey', 'SUBMITTED', '2026-10-11T15:00:00Z'), 'PENDING_SUPERVISOR_REVIEW', NULL, NULL, NULL, 1, NULL, NULL, 'EMPLOYEE'),
  ('stg-pp21-casey-v2-edit', 'emp-stg-emt-3', 'Novak, Casey', '2026-pp-21', '2026-09-27T07:00:00.000Z', '2026-10-10T07:00:00.000Z',
   '2026-10-12T15:00:00Z', 23, pg_temp.hours(23), pg_temp.shift('emp-stg-emt-3', '2026-pp-21', '2026-10-01', '2026-10-01T15:00:00Z', '2026-10-02T14:00:00Z'),
   pg_temp.ack('emp-stg-emt-3', 'Novak, Casey', 'SUBMITTED', '2026-10-11T15:00:00Z'), 'RETURNED', 'Please confirm the corrected start time.', '2026-10-12T16:00:00Z', 'Harper, Quinn', 2, 'stg-pp21-casey-v1', 'SUPERVISOR_COMPENSATION_CORRECTION', 'SUPERVISOR'),
  ('stg-pp21-casey-legacy-resub', 'emp-stg-emt-3', 'Novak, Casey', '2026-pp-21', '2026-09-27T07:00:00.000Z', '2026-10-10T07:00:00.000Z',
   '2026-10-13T15:00:00Z', 23, pg_temp.hours(23), pg_temp.shift('emp-stg-emt-3', '2026-pp-21', '2026-10-01', '2026-10-01T15:00:00Z', '2026-10-02T14:00:00Z'),
   pg_temp.ack('emp-stg-emt-3', 'Novak, Casey', 'RESUBMITTED', '2026-10-13T15:00:00Z'), 'PENDING_SUPERVISOR_REVIEW', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  -- Taylor: approved.
  ('stg-pp21-taylor-v1', 'emp-stg-medic-1', 'Brooks, Taylor', '2026-pp-21', '2026-09-27T07:00:00.000Z', '2026-10-10T07:00:00.000Z',
   '2026-10-11T18:00:00Z', 48, pg_temp.hours(48), pg_temp.shift('emp-stg-medic-1', '2026-pp-21', '2026-10-05', '2026-10-05T14:00:00Z', '2026-10-06T14:00:00Z'),
   pg_temp.ack('emp-stg-medic-1', 'Brooks, Taylor', 'SUBMITTED', '2026-10-11T18:00:00Z'), 'APPROVED', NULL, '2026-10-12T17:00:00Z', 'Reyes, Morgan', 1, NULL, 'EMPLOYEE_SUBMISSION', 'EMPLOYEE'),
  -- Drew: returned, then resubmitted with the new code (lineage recorded).
  ('stg-pp21-drew-v1', 'emp-stg-medic-2', 'Patel, Drew', '2026-pp-21', '2026-09-27T07:00:00.000Z', '2026-10-10T07:00:00.000Z',
   '2026-10-11T19:00:00Z', 12, pg_temp.hours(12), pg_temp.shift('emp-stg-medic-2', '2026-pp-21', '2026-10-07', '2026-10-07T14:00:00Z', '2026-10-08T02:00:00Z', 'P'),
   pg_temp.ack('emp-stg-medic-2', 'Patel, Drew', 'SUBMITTED', '2026-10-11T19:00:00Z'), 'RETURNED', 'Missing second shift.', '2026-10-12T18:00:00Z', 'Harper, Quinn', 1, NULL, 'EMPLOYEE_SUBMISSION', 'EMPLOYEE'),
  ('stg-pp21-drew-v2', 'emp-stg-medic-2', 'Patel, Drew', '2026-pp-21', '2026-09-27T07:00:00.000Z', '2026-10-10T07:00:00.000Z',
   '2026-10-13T19:00:00Z', 24, pg_temp.hours(24), pg_temp.shift('emp-stg-medic-2', '2026-pp-21', '2026-10-07', '2026-10-07T14:00:00Z', '2026-10-08T02:00:00Z', 'P') || pg_temp.shift('emp-stg-medic-2', '2026-pp-21', '2026-10-09', '2026-10-09T14:00:00Z', '2026-10-10T02:00:00Z', 'P'),
   pg_temp.ack('emp-stg-medic-2', 'Patel, Drew', 'RESUBMITTED', '2026-10-13T19:00:00Z'), 'PENDING_SUPERVISOR_REVIEW', NULL, NULL, NULL, 2, 'stg-pp21-drew-v1', 'EMPLOYEE_RESUBMISSION', 'EMPLOYEE');
-- Jamie (hyphenated surname) and José (accented name) have not submitted
-- pp-21 yet: use them to test electronic signatures.

INSERT INTO public.editable_timecard_rows (id, employee_id, pay_period_key, date_key, row_data, updated_at) VALUES
  ('emp-stg-emt-2-2026-pp-21-2026-10-02', 'emp-stg-emt-2', '2026-pp-21', '2026-10-02',
   '{"shiftLabel":"R1","payType":"DAILY_OT_DT","clockInDate":"2026-10-02","clockInTime":"07:00","clockOutDate":"2026-10-02","clockOutTime":"19:00"}',
   '2026-10-11T16:55:00Z');

-- 2026-pp-22 (current period): one pending submission.
INSERT INTO public.submitted_timecards
  (id, employee_id, employee_name, pay_period_key, pay_period_start, pay_period_end, submitted_at, total_hours,
   pay_breakdown, punches, submission_acknowledgement, status, version_number, version_reason, created_by_role)
VALUES
  ('stg-pp22-taylor-v1', 'emp-stg-medic-1', 'Brooks, Taylor', '2026-pp-22', '2026-10-11T07:00:00.000Z', '2026-10-24T07:00:00.000Z',
   '2026-10-14T16:00:00Z', 24, pg_temp.hours(24), pg_temp.shift('emp-stg-medic-1', '2026-pp-22', '2026-10-12', '2026-10-12T14:00:00Z', '2026-10-13T14:00:00Z'),
   pg_temp.ack('emp-stg-medic-1', 'Brooks, Taylor', 'SUBMITTED', '2026-10-14T16:00:00Z'), 'PENDING_SUPERVISOR_REVIEW', 1, 'EMPLOYEE_SUBMISSION', 'EMPLOYEE');

-- Schedule for pp-21 so the supervisor screen lists who still owes a timecard.
INSERT INTO public.schedules (id, date_key) VALUES ('2026-10-04', '2026-10-04'), ('2026-10-06', '2026-10-06');
INSERT INTO public.schedule_assignments (id, schedule_id, date_key, shift_key, shift_label, slot_number, employee_id, start_time, end_time) VALUES
  ('2026-10-04-R1-1', '2026-10-04', '2026-10-04', 'R1', 'R1', 1, 'emp-stg-medic-3', '07:00', '07:00'),
  ('2026-10-04-R1-2', '2026-10-04', '2026-10-04', 'R1', 'R1', 2, 'emp-stg-emt-4', '07:00', '07:00'),
  ('2026-10-06-R2-1', '2026-10-06', '2026-10-06', 'R2', 'R2', 1, 'emp-stg-emt-1', '07:00', '19:00');
