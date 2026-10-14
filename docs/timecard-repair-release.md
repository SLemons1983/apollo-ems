# Timecard resubmission repair: release guide

Branch `claude/bold-hawking-idxk8h`. Nothing here has been deployed.

## What changed

| Area | Change |
|---|---|
| Current-version rule | `src/lib/timecardWorkflow.ts` is the single rule for which timecard record is current (lineage, then time, version, id), used by the employee dashboard, supervisor queues, payroll status, the approved packet, default period selection and analytics. |
| Resubmission | Employee submissions record version, parent and reason; resubmissions are always visible to supervisors. Stuck legacy resubmissions reappear without data changes. |
| Approved packet | Exactly one current approved record per employee; superseded approvals are listed separately and excluded. |
| Corrections | Saved rows load for whichever period is selected; a returned card is restored once, in the database (`restore_returned_timecard_rows`), never over newer corrections; the table is read-only until the restore check finishes. |
| Signature | Matches the signed-in employee's own first/last name, ignoring case, accents, spacing and punctuation; clear messages; IDs/placeholders never accepted. |
| Submission state | Every failure path resets "Submitting…". |
| Finalized payroll | Employees cannot submit into a finalized period and are told a supervisor can reopen payroll; supervisor locks now apply to every period. Returned cards stay editable outside the two-period window. |
| Environments | Supabase settings come from one module; non-production builds cannot use the production project; email/SMS/CAD are blocked outside production. |
| Removed | Temporary `/api/supervisor/timecard-diagnostic` (hard-coded employee names). |

## Database change (production)

One additive migration: `supabase/migrations/202610140001_restore_returned_timecard_rows.sql`.
It creates a single function (`SECURITY INVOKER`, execute granted to
`authenticated` only). No tables, columns, policies or rows change. It is
written to work whatever the production types of `editable_timecard_rows.date_key`
(text/date) and `updated_at` (text/timestamptz) are.

The app works without it (it falls back to the previous restore), so the
migration may be applied before or after the app release. Applying it first
is recommended.

## Required configuration before release

1. **Confirm columns** (read-only, Supabase Table Editor, production):
   `submitted_timecards` has `version_number`, `parent_timecard_id`,
   `version_reason`, `created_by_role`, `created_by_employee_id`
   (migration `202609300001`). If any is missing, do not release.
2. **Confirm `editable_timecard_rows`** has a primary key or unique constraint on `id`
   (the app's upserts already rely on it).
3. **Vercel → Settings → Environment Variables → "Automatically expose System
   Environment Variables"**: must be on, so production builds see
   `VERCEL_ENV=production`. Otherwise set `APOLLO_DEPLOYMENT_ENVIRONMENT=production`
   for the Production environment only. If neither is present, the production
   build fails safely (the live site is unaffected).
4. **Keep** "Only build production" and the `vercel.json` branch restriction
   until staging and Preview are verified.

## Release procedure

1. Choose a window between pay periods; tell supervisors that previously
   hidden resubmissions will appear in the Resubmitted queue.
2. Apply the migration to production (Supabase SQL editor, paste the file,
   run). Verify: `select proname from pg_proc where proname = 'restore_returned_timecard_rows';`
3. Merge the branch into `main` (pull request, review). Vercel builds production.
4. Check the deployment build log for success, then sign in at apolloems.org
   as an employee and a supervisor and verify the dashboard, the supervisor
   queues and the payroll status table load.
5. Watch the first returned/resubmitted timecards through to approval.

## Rollback

- **App**: in Vercel, promote the previous production deployment (commit
  `96bfd8d`), or revert the merge commit on `main`. No data migration needs
  undoing: records written by the new code (version/parent fields, restore
  marker rows hidden via `deleted: true`) are read correctly by the old code.
- **Database function**: harmless to leave in place. To remove:
  `drop function public.restore_returned_timecard_rows(text, text, text, timestamptz, text, jsonb);`
- No production data is modified by this release.

## Tests

`npm test` (111 unit/workflow tests), `npm run test:db` (61 real-PostgreSQL
tests, local only), `npm run typecheck`, `npm run build`. Lint has pre-existing
failures on `main`; this branch reduces them and adds none.
