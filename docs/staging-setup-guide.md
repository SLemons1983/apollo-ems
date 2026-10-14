# ApolloEMS staging: setup and browser test guide

Staging Supabase project: `eejahcuftznsabulssew` (initialized). Production
(`xyrusrspvyuwpplhhett`, apolloems.org) is never touched by any step here.

## Decision needed

The full workflow needs **two Google accounts**: one acting as supervisor and
one as employee (a supervisor may not approve their own timecard). Use any
second Google account you control.

## Step 1: Supabase (staging project only)

1. **Verify (optional, read-only).** SQL Editor: paste
   `supabase/staging/verify-readonly.sql` and run. Every row should be PASS.
2. **Link your Google accounts to synthetic profiles.** From the repository on
   the branch, run (it asks for the staging password and both emails, and only
   stores the emails):
   ```bash
   STAGING_DATABASE_URL='postgresql://postgres.eejahcuftznsabulssew@PASTE-SESSION-POOLER-HOST:5432/postgres' \
     scripts/add-staging-tester.sh
   ```
   It creates "Staging Supervisor" and "Staging Employee". No real employee
   data is involved; anyone else who signs in sees nothing (row-level
   security). Remove later with `scripts/add-staging-tester.sh --remove`.
3. **Authentication → Providers → Google:** enable; paste the Client ID and
   Client secret from Step 2.
4. **Authentication → URL Configuration:**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`, `https://*.app.github.dev/**`
     (Codespaces) and, for later Preview use,
     `https://*-slemons1983s-projects.vercel.app/**`.
5. **Project Settings → API Keys:** keep the staging publishable key and secret
   (service role) key available for Step 3 / Step 4. Never paste them into chat.

## Step 2: Google Cloud Console

Use a **separate OAuth client** for staging so the production login is not
affected (a separate Google Cloud project, e.g. "ApolloEMS Staging", is
cleanest).

1. APIs & Services → OAuth consent screen: User type External, publishing
   status **Testing**, and add both Google accounts as **test users**. Only
   those accounts can sign in to staging at all.
2. APIs & Services → Credentials → Create credentials → OAuth client ID →
   Web application, name "ApolloEMS Staging".
   - Authorized redirect URI: `https://eejahcuftznsabulssew.supabase.co/auth/v1/callback`
   - JavaScript origins: not needed.
3. Copy the Client ID and secret into Supabase (Step 1.3).

## Step 3: Test without Vercel (recommended first)

Runs the staging app in your Codespace; no Vercel change is needed.

```bash
cp .env.example .env.local   # then fill in, using STAGING values only:
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY,
#   APOLLO_OWNER_EMAILS=<your supervisor Google email>
npm ci && npm run dev
```

Open the forwarded port 3000 address (Ports tab). The build refuses to start
if `.env.local` points at production. If sign-in returns you to
`http://localhost:3000` instead of the Codespaces address, use a local computer
(`npm run dev`, open http://localhost:3000) or wait for Step 4.

## Step 4: Vercel Preview (later, needs your approval)

**Environment variables (Settings → Environment Variables)**

| Variable | Environment | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Preview, branch `claude/bold-hawking-idxk8h` | `https://eejahcuftznsabulssew.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same | staging publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | same | **staging** secret key |
| `APOLLO_OWNER_EMAILS` | same | your supervisor Google email |
| `APOLLO_NONPRODUCTION_EMAIL_ALLOWLIST` | same | your email, or leave unset for no email |

Audit existing variables: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`TWILIO_*`, `APOLLO_CAD_BASE_URL`, `APOLLO_INTEGRATION_SECRET`, `CRON_SECRET`,
`APOLLO_EMAIL_*` should be scoped to **Production only**. Do not add Twilio,
CAD or cron values to Preview.

**Enabling (only after approval):** (a) change `vercel.json`
`"claude/bold-hawking-idxk8h": false` to `true` (code change); (b) replace
"Only build production" with a custom Ignored Build Step that skips every
Preview except this branch:
`[ "$VERCEL_ENV" = "preview" ] && [ "$VERCEL_GIT_COMMIT_REF" != "claude/bold-hawking-idxk8h" ]`
(production always builds); (c) keep Deployment Protection on.

**Why Preview cannot reach production**

| Risk | Control | Tested |
|---|---|---|
| Production database | Build fails if a non-production build is given the production URL, or no URL; all code reads one validated setting | 15 unit tests, real preview/production builds |
| Production service key left in Preview | Useless: Supabase rejects a key from another project, and the URL is always staging | by design |
| Email (Resend) | Sent only to `APOLLO_NONPRODUCTION_EMAIL_ALLOWLIST`; none if unset, even with a production key | unit tests |
| SMS (Twilio) | Refused outside production | code guard |
| CAD | Refused unless `APOLLO_ALLOW_NONPRODUCTION_CAD=true` | unit tests |
| Cron jobs | Vercel runs crons only on production | platform rule |

## Step 5: Browser test (staging data only)

Today's current pay period is `2026-pp-22` (Oct 11 to 24). Use the employee
account in one browser and the supervisor account in another (or a private
window).

| # | Who | Action | Expected |
|---|---|---|---|
| 1 | Employee | Dashboard → Timecard (current period) → enter a shift, e.g. Oct 12 07:00 to 19:00 → Approve & Submit | Signature dialog opens |
| 2 | Employee | Type `Staging Employe` | Red message naming "Staging Employee"; Confirm disabled |
| 3 | Employee | Type `staging employee` → Confirm & Submit | "Timecard submitted for supervisor review"; form not stuck |
| 4 | Supervisor | Supervisor → Timecards → period Oct 11 to 24 | Staging Employee under Pending Review |
| 5 | Supervisor | Return with "Fix clock-out" | Moves to awaiting employee resubmission |
| 6 | Employee | Reload Dashboard | "Action Required — Timecard Returned" with the message; table editable after a moment |
| 7 | Employee | Change clock-out to 19:30; reload; switch to previous period and back | 19:30 is still there |
| 8 | Employee | Resubmit Timecard → sign → confirm | Pending again |
| 9 | Supervisor | Refresh | Card is under **Resubmitted** (not Pending Review); approve it |
| 10 | Supervisor | Approved list / Print packet for Oct 11 to 24 | Exactly one Staging Employee record, 12.5 hours |
| 11 | Supervisor | Period Sep 27 to Oct 10 | Resubmitted: Casey Novak and Drew Patel; Awaiting: Riley Okafor; Approved: Taylor Brooks |
| 12 | Supervisor | Period Sep 13 to 26 | Payroll locked; packet Avery Chen 23.5 h + Taylor Brooks 48 h = 71.5 h (one record each) |
| 13 | Employee | Select Sep 13 to 26 | "Payroll Finalized — Read Only"; submit blocked with reopen guidance |
| 14 | Supervisor | Submit your own timecard on the Dashboard, then open it in Supervisor | "Own Timecard — Needs Another Approver"; approve refused |
| 15 | Supervisor | Try sending an SMS | "SMS delivery is disabled outside the production environment" |

Afterwards, re-run `verify-readonly.sql`; all rows should still PASS.
