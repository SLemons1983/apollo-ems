-- ApolloEMS PRODUCTION: impact of RETURNED timecards with no reviewed_at.
-- READ-ONLY: one SELECT, counts and pay-period keys only (no names or hours).
--
-- "Current" uses the application's rule (src/lib/timecardWorkflow.ts,
-- selectCurrentTimecard): within an employee + pay period, a record named as
-- another record's parent is replaced; among the rest the newest submitted_at
-- wins, then the higher version (NULL = 1), then the higher id.
--   historical : replaced by a later record; never restored or shown as returned
--   finalized  : current, but payroll for that period is finalized (read-only)
--   active     : current and open; the employee still has to correct and resubmit

WITH cards AS (
  SELECT t.id::text AS id, t.employee_id::text AS employee_id, t.pay_period_key::text AS pay_period_key,
         upper(t.status::text) AS status, nullif(btrim(t.reviewed_at::text), '') IS NULL AS no_return_time,
         CASE WHEN t.submitted_at::text ~ '^\d{4}-\d{2}-\d{2}' THEN t.submitted_at::text::timestamptz END AS submitted_ts,
         coalesce(t.version_number, 1) AS version, t.parent_timecard_id::text AS parent_id
    FROM public.submitted_timecards t
),
flagged AS (
  SELECT c.*,
         EXISTS (SELECT 1 FROM cards x
                  WHERE x.parent_id = c.id AND x.employee_id = c.employee_id AND x.pay_period_key = c.pay_period_key) AS replaced
    FROM cards c
),
ranked AS (
  SELECT f.*,
         row_number() OVER (PARTITION BY f.employee_id, f.pay_period_key
                            ORDER BY f.replaced, f.submitted_ts DESC NULLS LAST, f.version DESC, f.id COLLATE "C" DESC) = 1 AS is_current
    FROM flagged f
),
legacy AS (
  SELECT r.*,
         CASE WHEN NOT r.is_current THEN 'historical'
              WHEN EXISTS (SELECT 1 FROM public.payroll_submissions p WHERE p.pay_period_key::text = r.pay_period_key) THEN 'finalized'
              ELSE 'active' END AS category,
         EXISTS (SELECT 1 FROM public.editable_timecard_rows e
                  WHERE e.employee_id::text = r.employee_id AND e.pay_period_key::text = r.pay_period_key
                    AND e.id::text NOT LIKE '%-restore-marker-%') AS has_saved_rows
    FROM ranked r
   WHERE r.status = 'RETURNED' AND r.no_return_time
)
SELECT item, detail FROM (
  SELECT 1 AS ord, 'RETURNED with no reviewed_at: total' AS item, count(*)::text AS detail FROM legacy
  UNION ALL
  SELECT 2, 'historical: replaced by a later submission (no effect on anyone)', count(*)::text FROM legacy WHERE category = 'historical'
  UNION ALL
  SELECT 3, 'finalized: current, but payroll finalized (read-only; a supervisor must reopen payroll)', count(*)::text FROM legacy WHERE category = 'finalized'
  UNION ALL
  SELECT 4, 'active: employee still needs to correct and resubmit', count(*)::text FROM legacy WHERE category = 'active'
  UNION ALL
  SELECT 5, '  active, employee has saved rows: rows kept as they are (marker only)', count(*)::text FROM legacy WHERE category = 'active' AND has_saved_rows
  UNION ALL
  SELECT 6, '  active, no saved rows: returned shifts copied into the editable table', count(*)::text FROM legacy WHERE category = 'active' AND NOT has_saved_rows
  UNION ALL
  SELECT 7, '  active, by pay period', coalesce(string_agg(format('%s=%s', pay_period_key, n), ', ' ORDER BY pay_period_key), 'none')
    FROM (SELECT pay_period_key, count(*) AS n FROM legacy WHERE category = 'active' GROUP BY 1) a
  UNION ALL
  SELECT 8, '  active, distinct employees', count(DISTINCT employee_id)::text FROM legacy WHERE category = 'active'
  UNION ALL
  SELECT 9, 'RETURNED with a reviewed_at that are active (new-style returns, for comparison)',
         count(*)::text FROM ranked r
   WHERE r.status = 'RETURNED' AND NOT r.no_return_time AND r.is_current
     AND NOT EXISTS (SELECT 1 FROM public.payroll_submissions p WHERE p.pay_period_key::text = r.pay_period_key)
) q
ORDER BY ord;
