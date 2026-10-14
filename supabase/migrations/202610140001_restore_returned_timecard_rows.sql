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
-- Security: nothing the caller sends is trusted. The database itself
-- establishes who the caller is and what they may restore:
--   * identity: auth.uid() -> auth.users.email -> exactly one employees row
--     (case-insensitive email, the same mapping the application uses);
--     p_employee_id must be that employee;
--   * the timecard: must exist in submitted_timecards, belong to that
--     employee and pay period and have status RETURNED;
--     p_returned_reviewed_at must equal the stored reviewed_at, and only the
--     stored value is used for the correction-overwrite protection;
--   * legacy returns (stored reviewed_at is NULL; the caller must also send
--     NULL): with no return time, any saved row may be a correction, so if the
--     employee has ANY saved row for the period only the marker is written;
--     otherwise the returned shifts are copied in, never updating a row.
--     No timestamp is invented and the timecard is not modified;
--   * writes: only rows of that employee and pay period.
-- It is SECURITY DEFINER because auth.users is not readable by signed-in
-- users; these checks, not row-level security, therefore decide access.
-- Execute is granted to authenticated only.
--
-- Additive change: creates one function. No tables, columns, policies or
-- existing data are modified.
--
-- Written to work whether date_key is text or date and whether updated_at /
-- reviewed_at are text (ISO-8601) or timestamptz: values are converted through
-- the table's own row type (jsonb_populate_record), never by implicit casts.

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
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_employee_id text;
  v_employee_matches integer;
  v_card record;
  v_returned_at timestamptz;
  v_legacy_return boolean;
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

  -- Who is calling: resolved by the database, never taken from the request.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'restore_returned_timecard_rows: not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT lower(btrim(u.email)) INTO v_email FROM auth.users u WHERE u.id = v_uid;
  IF coalesce(v_email, '') = '' THEN
    RAISE EXCEPTION 'restore_returned_timecard_rows: signed-in user has no email' USING ERRCODE = '42501';
  END IF;

  SELECT count(*), min(e.id::text) INTO v_employee_matches, v_employee_id
    FROM public.employees e
   WHERE lower(btrim(e.email)) = v_email;
  IF v_employee_matches <> 1 THEN
    RAISE EXCEPTION 'restore_returned_timecard_rows: signed-in user does not match exactly one employee'
      USING ERRCODE = '42501';
  END IF;

  IF p_employee_id IS DISTINCT FROM v_employee_id THEN
    RAISE EXCEPTION 'restore_returned_timecard_rows: employee does not match the signed-in user'
      USING ERRCODE = '42501';
  END IF;

  v_prefix := v_employee_id || '-' || p_pay_period_key || '-';
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

  -- The timecard must be this employee's RETURNED card for this pay period.
  SELECT t.employee_id::text AS employee_id, t.pay_period_key::text AS pay_period_key,
         t.status::text AS status, t.reviewed_at::text AS reviewed_at
    INTO v_card
    FROM public.submitted_timecards t
   WHERE t.id::text = p_returned_timecard_id;

  IF NOT FOUND
     OR v_card.employee_id IS DISTINCT FROM v_employee_id
     OR v_card.pay_period_key IS DISTINCT FROM p_pay_period_key
     OR upper(coalesce(v_card.status, '')) <> 'RETURNED' THEN
    RAISE EXCEPTION 'restore_returned_timecard_rows: not a returned timecard of this employee and pay period'
      USING ERRCODE = '42501';
  END IF;

  -- Return time: the stored value is authoritative. A card returned before
  -- return times were recorded has none (legacy); the caller must agree.
  v_legacy_return := nullif(btrim(v_card.reviewed_at), '') IS NULL;

  IF v_legacy_return THEN
    IF p_returned_reviewed_at IS NOT NULL THEN
      RAISE EXCEPTION 'restore_returned_timecard_rows: return time does not match the timecard'
        USING ERRCODE = '22023';
    END IF;
  ELSE
    BEGIN
      v_returned_at := v_card.reviewed_at::timestamptz;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow OR invalid_text_representation THEN
      v_returned_at := NULL;
    END;

    IF v_returned_at IS NULL OR v_returned_at IS DISTINCT FROM p_returned_reviewed_at THEN
      RAISE EXCEPTION 'restore_returned_timecard_rows: return time is missing, invalid or does not match the timecard'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.editable_timecard_rows WHERE id = v_marker_id) THEN
    RETURN 'ALREADY_RESTORED';
  END IF;

  IF v_legacy_return THEN
    -- No return time: every saved row may be a correction, so keep them all.
    v_changed_after_return := EXISTS (
      SELECT 1 FROM public.editable_timecard_rows r
       WHERE r.employee_id::text = v_employee_id
         AND r.pay_period_key::text = p_pay_period_key
         AND r.id NOT LIKE v_prefix || 'restore-marker-%');
  ELSE
    SELECT max(r.updated_at::timestamptz)
      INTO v_latest
      FROM public.editable_timecard_rows r
     WHERE r.employee_id::text = v_employee_id
       AND r.pay_period_key::text = p_pay_period_key
       AND r.id NOT LIKE v_prefix || 'restore-marker-%';

    v_changed_after_return := v_latest IS NOT NULL AND v_latest > v_returned_at;
  END IF;

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
                       'employee_id', v_employee_id,
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
     WHERE existing.employee_id::text = v_employee_id
       AND NOT v_legacy_return
       AND (existing.updated_at IS NULL OR existing.updated_at::timestamptz <= v_returned_at);
    GET DIAGNOSTICS v_copied = ROW_COUNT;
  END IF;

  INSERT INTO public.editable_timecard_rows (id, employee_id, pay_period_key, date_key, row_data, updated_at)
  SELECT m.id, m.employee_id, m.pay_period_key, m.date_key, m.row_data, m.updated_at
    FROM jsonb_populate_record(
           NULL::public.editable_timecard_rows,
           jsonb_build_object(
             'id', v_marker_id,
             'employee_id', v_employee_id,
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
-- Supabase grants new functions to anon by default; signed-out callers may not run it.
REVOKE ALL ON FUNCTION public.restore_returned_timecard_rows(text, text, text, timestamptz, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.restore_returned_timecard_rows(text, text, text, timestamptz, text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.restore_returned_timecard_rows(text, text, text, timestamptz, text, jsonb) IS
  'Copies a returned timecard into editable rows exactly once (marker row), atomically, without overwriting rows changed after the return. SECURITY DEFINER: the caller is identified by auth.uid() and may restore only their own RETURNED timecard.';
