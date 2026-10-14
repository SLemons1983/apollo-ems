# Timecard resubmission repair: production release plan

Branch `claude/bold-hawking-idxk8h`, based on `main` at `96bfd8d` (current
production). Nothing here has been deployed or applied to production.

## What changes

| Area | Change |
|---|---|
| Current-version rule | `src/lib/timecardWorkflow.ts` is the single rule for which timecard record is current. The employee dashboard, supervisor queues, payroll status, the approved packet, default period selection and analytics all use it. |
| Resubmission | Employee submissions now also write `version_number`, `parent_timecard_id`, `version_reason`, `created_by_role` and `created_by_employee_id`. Resubmissions always appear under **Resubmitted**. Previously hidden resubmissions reappear without any data change. |
| Approved packet | Exactly one current approved record per employee and period. Superseded approvals are listed separately and excluded from totals. |
| Corrections | Saved rows load for whichever period is selected. A returned card is copied into the editable table once (`restore_returned_timecard_rows`) and never over newer corrections. |
| Signature | Matches the signed-in employee's own first and last name, ignoring case, accents, spacing and punctuation. Messages are clear. "Submitting…" can no longer get stuck. |
| Finalized payroll | Employees cannot submit into a finalized period and are told how to get it reopened. Supervisor payroll locks now apply to every period. |
| Self-approval | A supervisor cannot approve their own timecard. The old check compared against a constant and never matched. |
| Supabase settings | All code reads one validated setting (`src/lib/supabaseConfig.ts`) instead of 26 hard-coded copies. Production resolves to the same project and key as today. |
| Removed | Temporary `/api/supervisor/timecard-diagnostic`, which hard-coded two employees' names. |

Runtime dependencies are identical to `main`. Only dev/test packages were added.

## Step 0: read-only production check (before anything else)

Paste `supabase/production/readiness-readonly.sql` into the **production**
SQL Editor and run it. It is a single `SELECT`: it changes nothing and returns
no employee data. **Every row marked FAIL blocks the release.** Share the
output; redact any email addresses that appear in policy text.

The release depends on these results:

- The five version columns exist with an employee INSERT allowed (FAIL means employee submissions would error).
- `editable_timecard_rows(id)` has a primary key or unique constraint.
- `editable_timecard_rows` has no extra required columns, and its `updated_at` values are ISO timestamps.
- Section 5 policies let an employee insert their own `submitted_timecards` row and read `payroll_submissions`. Today's `main` already needs this.

Also check one setting in Vercel, without changing it: Settings → Environment
Variables → **"Automatically expose System Environment Variables"** should be on.
The build reads `VERCEL_ENV=production` from it. If it is off, the production
build fails safely and the live site stays on `96bfd8d`. Then either turn it on
or add `APOLLO_DEPLOYMENT_ENVIRONMENT=production` (Production only).
Existing `NEXT_PUBLIC_SUPABASE_*` variables need no changes. In production,
any one that is missing falls back to the current production value.

## Release sequence

Choose a time when supervisors are not mid-approval, and tell them that
earlier hidden resubmissions may now appear under Resubmitted.

1. **Migration (production SQL Editor):** paste
   `supabase/migrations/202610140001_restore_returned_timecard_rows.sql` and run it.
   It creates one function and changes no tables, policies or rows.
2. **Verify the function:**
   ```sql
   select p.oid::regprocedure, not p.prosecdef as invoker,
          has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_run,
          has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_run
     from pg_proc p where p.proname = 'restore_returned_timecard_rows';
   ```
   Expected: one row, `invoker = true`, `authenticated_can_run = true`, `anon_can_run = false`.
3. **Open a pull request** from the branch to `main`, review it and merge it.
   Vercel builds production from `main`. The branch entry in `vercel.json`
   has no effect on `main`.
4. **Watch the build** in Vercel and confirm it succeeds and is promoted.
5. **Smoke test (real accounts, no test data written):** as an employee, open
   the Dashboard → Timecard and confirm the current period and saved entries
   load. As a supervisor, open Supervisor → Timecards and confirm the queues
   and payroll status load. Open the approved packet for the last finalized
   period. Its totals should match what payroll already received. They should
   differ only where Step 0 reported employee+period groups with more than one
   APPROVED row, which were previously counted twice.
6. **First real cycle:** follow the next returned → corrected → resubmitted →
   approved timecard to completion.

The app also works if step 1 has not been applied yet: it falls back to the
previous restore method. Applying the migration first is recommended.

## Rollback

- **App:** in Vercel → Deployments, promote the previous production deployment
  (`96bfd8d`) with Instant Rollback, then revert the merge commit on `main`.
  Old code reads records written by the new code correctly: the version fields
  are ones it already reads, and restore marker rows are `deleted: true`,
  which it already hides. Rolling back also brings back the original defects
  (hidden resubmissions, corrections overwritten on reload).
- **Database function:** it is safe to leave in place. To remove it:
  ```sql
  drop function if exists public.restore_returned_timecard_rows(text, text, text, timestamptz, text, jsonb);
  ```
- **Data:** the release changes no existing rows. New code only adds rows
  through normal use (submissions, editable rows, restore markers), which is
  the same as today.

## Verification run on this branch

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm test` (workflow, lifecycle/payroll invariants, restore, pay periods, environment, integration guards) | 121 pass |
| `npm run test:db` on PostgreSQL 16.15 and 17.10 (local) | 80 pass each |
| `VERCEL_ENV=production npm run build`, with no Supabase variables set | pass; production URL inlined into 44 server bundles; no staging reference in the output |
| `npx eslint src` | 122 errors / 109 warnings, all pre-existing (`main`: 123 / 110) |
| `readiness-readonly.sql` on PostgreSQL 16 and 17 rehearsal schemas | all PASS; a deliberately broken schema produces the expected FAILs, without errors |
