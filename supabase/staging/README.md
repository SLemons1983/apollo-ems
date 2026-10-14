# ApolloEMS staging database

Synthetic, isolated database for testing in the staging Supabase project
`eejahcuftznsabulssew` (organization "ApolloEMS Staging"). **Never apply any of
this to production (`xyrusrspvyuwpplhhett`).**

## Files (apply in this order)

| Step | File | Purpose |
|---|---|---|
| 1 | `001_reconstructed_base_schema.sql` | Tables that production created outside migrations, **reconstructed from application code**. Refuses to run if the tables already exist. |
| 2 | `../migrations/*.sql` (name order) | The repository's real migrations, including `202610140001_restore_returned_timecard_rows.sql`. |
| 3 | `002_staging_access_rules.sql` | Staging row-level security, SMS authorization function, realtime, storage buckets. |
| 4 | `003_synthetic_seed.sql` | Fictional employees (`@example.test`) and timecards in every workflow state. |

`scripts/apply-staging.sh` applies all of them with safety checks (staging-only
connection string, server identity shown, typed confirmation, one transaction
per file).

## One-time setup (copy and paste)

Run in a terminal that has `git`, `psql` and `python3` (your Codespace has
all three). You need two things from the **staging** project dashboard
(Connect → Session pooler): the host name, and the staging database password
(you will type it at a hidden prompt; it is never put in the command).

```bash
cd /workspaces/apollo-ems 2>/dev/null || { git clone https://github.com/SLemons1983/apollo-ems.git && cd apollo-ems; }
git fetch origin claude/bold-hawking-idxk8h && git checkout claude/bold-hawking-idxk8h && git pull --ff-only
STAGING_DATABASE_URL='postgresql://postgres.eejahcuftznsabulssew@PASTE-SESSION-POOLER-HOST:5432/postgres' \
  scripts/apply-staging.sh
```

The script shows the server it reached and the 19 files it will apply, then
waits for you to type `APPLY TO STAGING`. Anything else cancels with no
change. It refuses the production project, other projects, non-Supabase
hosts, passwords inside the URL, the transaction pooler (port 6543) and any
database that already has tables. It ends with a verification summary.

## Verified locally

`npm run test:db` builds the whole stack on a local PostgreSQL server and
checks it (authorization by role, supervisor queues, payroll totals, a full
return/resubmit cycle, signatures, finalized periods, the restore function's
concurrency). Start a local server with `scripts/local-test-db.sh start`.

## Known differences from production (not verifiable from the repository)

- **Column types and constraints** of the reconstructed tables are inferred.
  `pay_period_start/end` are text here; production may use timestamptz.
  `date_key` columns are text here; production may use date.
- **Row-level security**: production policies are unknown. The staging rules
  are written from app behaviour. Notably, employees cannot write
  `schedule_assignments` here, so the employee vacation-request flow that
  edits schedule rows may fail in staging.
- **Storage policies** for the two private buckets are not reproduced; file
  uploads may be refused in staging.
- **`time_punches`** has no writer in this repository; its real key and
  defaults are unknown.
- **Database functions/triggers** that production may have outside migrations
  (for example `is_authorized_sms_supervisor`) are staging re-implementations.
- **Repository migrations insert real reference data**: the owner agency row
  (owner email) and a named CE-instructor policy come from the repository's
  own migrations, not from the synthetic seed.

Final compatibility must be confirmed against an authoritative, schema-only
export of production when one is available.

## Signing in to staging

Add one employee row with your own login email as a supervisor (see the
comment at the top of `003_synthetic_seed.sql`), and configure the staging
project's Google provider and redirect URLs (see `docs/preview-and-staging.md`).
