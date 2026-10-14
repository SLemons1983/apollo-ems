-- ApolloEMS: concurrency-safe restoration of a returned timecard.
--
-- When a supervisor returns a timecard, the employee dashboard copies the
-- returned shifts into editable_timecard_rows once, and records that with a
-- permanent marker row. This function performs that decision and both writes
-- inside ONE transaction, serialized per employee and pay period, so:
--   * exactly one device ever restores a given returned timecard;
--   * the copy and the marker are saved together or not at all;
--   * rows changed after the return (corrections) are never overwritten,
--     including corrections committed concurrently.
--
-- Additive change: creates one function. No tables, columns, policies or
-- existing data are modified. SECURITY INVOKER: it runs with the caller's
-- permissions, so the existing row-level security on editable_timecard_rows
-- applies exactly as it does to the dashboard's direct writes.
--
-- Written to work whether date_key is text or date and whether updated_at is
-- text (ISO-8601) or timestamptz, because the production column types are not
-- defined in this repository: values are converted through the table's own
-- row type (jsonb_populate_record), never by implicit casts.

CREATE OR REPLACE FUNCTION public.restore_returned_timecard_rows(
  p_employee_id text,
  p_pay_period_key text,
  p_returned_timecard_id text,
  p_returned_reviewed_at timestamptz,
  p_marker_date_key text,
  p_rows jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prefix text;
  v_marker_id text;
  v_now text := to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_latest timestamptz;
  v_changed_after_return boolean;
  v_row jsonb;
  v_copied integer := 0;
BEGIN
  IF coalesce(p_employee_id, '') = '' OR coalesce(p_pay_period_key, '') = ''
     OR coalesce(p_returned_timecard_id, '') = '' OR coalesce(p_marker_date_key, '') = '' THEN
    RAISE EXCEPTION 'restore_returned_timecard_rows: employee, pay period, timecard and marker date are required'
      USING ERRCODE = '22023';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'restore_returned_timecard_rows: p_rows must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  v_prefix := p_employee_id || '-' || p_pay_period_key || '-';
  v_marker_id := v_prefix || 'restore-marker-' || p_returned_timecard_id;

  -- Every row must be a visible editable row of this employee and period.
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    IF jsonb_typeof(v_row) <> 'object'
       OR coalesce(v_row->>'id', '') = ''
       OR left(v_row->>'id', length(v_prefix)) <> v_prefix
       OR position('restore-marker-' IN v_row->>'id') > 0
       OR coalesce(v_row->>'date_key', '') = ''
       OR jsonb_typeof(v_row->'row_data') <> 'object' THEN
      RAISE EXCEPTION 'restore_returned_timecard_rows: invalid row %', coalesce(v_row->>'id', '(missing id)')
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- Serialize every restore of this employee and pay period (all devices).
  PERFORM pg_advisory_xact_lock(hashtextextended('apollo-restore:' || v_prefix, 0));

  IF EXISTS (SELECT 1 FROM public.editable_timecard_rows WHERE id = v_marker_id) THEN
    RETURN 'ALREADY_RESTORED';
  END IF;

  SELECT max(r.updated_at::timestamptz)
    INTO v_latest
    FROM public.editable_timecard_rows r
   WHERE r.employee_id = p_employee_id
     AND r.pay_period_key = p_pay_period_key
     AND r.id NOT LIKE v_prefix || 'restore-marker-%';

  v_changed_after_return :=
    v_latest IS NOT NULL AND p_returned_reviewed_at IS NOT NULL AND v_latest > p_returned_reviewed_at;

  IF NOT v_changed_after_return THEN
    -- jsonb_populate_recordset converts each value to the table's own column
    -- types (text, date, timestamptz, json or jsonb).
    INSERT INTO public.editable_timecard_rows AS existing
      (id, employee_id, pay_period_key, date_key, row_data, updated_at)
    SELECT r.id, r.employee_id, r.pay_period_key, r.date_key, r.row_data, r.updated_at
      FROM jsonb_populate_recordset(
             NULL::public.editable_timecard_rows,
             (SELECT jsonb_agg(jsonb_build_object(
                       'id', value->>'id',
                       'employee_id', p_employee_id,
                       'pay_period_key', p_pay_period_key,
                       'date_key', value->>'date_key',
                       'row_data', value->'row_data',
                       'updated_at', v_now))
                FROM jsonb_array_elements(p_rows))
           ) AS r
    ON CONFLICT (id) DO UPDATE
       SET date_key = EXCLUDED.date_key,
           row_data = EXCLUDED.row_data,
           updated_at = EXCLUDED.updated_at
     -- Re-checked against the latest committed row: a correction saved after
     -- the return, even by a concurrent request, is never overwritten.
     WHERE existing.updated_at IS NULL
        OR p_returned_reviewed_at IS NULL
        OR existing.updated_at::timestamptz <= p_returned_reviewed_at;
    GET DIAGNOSTICS v_copied = ROW_COUNT;
  END IF;

  INSERT INTO public.editable_timecard_rows (id, employee_id, pay_period_key, date_key, row_data, updated_at)
  SELECT m.id, m.employee_id, m.pay_period_key, m.date_key, m.row_data, m.updated_at
    FROM jsonb_populate_record(
           NULL::public.editable_timecard_rows,
           jsonb_build_object(
             'id', v_marker_id,
             'employee_id', p_employee_id,
             'pay_period_key', p_pay_period_key,
             'date_key', p_marker_date_key,
             'row_data', jsonb_build_object(
               'deleted', true,
               'restoreMarker', true,
               'restoredFromTimecardId', p_returned_timecard_id,
               'restoredAt', v_now,
               'rowsCopied', v_copied),
             'updated_at', v_now)
         ) AS m
  ON CONFLICT (id) DO NOTHING;

  RETURN CASE WHEN v_changed_after_return THEN 'MARKER_ONLY' ELSE 'RESTORED' END;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_returned_timecard_rows(text, text, text, timestamptz, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_returned_timecard_rows(text, text, text, timestamptz, text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.restore_returned_timecard_rows(text, text, text, timestamptz, text, jsonb) IS
  'Copies a returned timecard into editable rows exactly once (marker row), atomically, without overwriting rows changed after the return. SECURITY INVOKER; RLS applies.';
