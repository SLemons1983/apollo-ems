# Preview deployments and staging

## How the app chooses its database

`next.config.ts` calls `resolveSupabasePublicConfig` (`src/lib/supabaseEnvironment.ts`)
at build time and inlines the result. The deployment environment comes from
`APOLLO_DEPLOYMENT_ENVIRONMENT` if set, otherwise Vercel's `VERCEL_ENV`,
otherwise `local`.

| Deployment | Supabase variables | Result |
|---|---|---|
| production | none set | production project (today's behaviour) |
| production | set to production | production project |
| production | set to any other project | **build fails** |
| preview / development / local | staging values | staging project |
| preview / development / local | missing | **build fails** |
| preview / development / local | production project | **build fails** |

Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` name is also accepted).

## Live integrations outside production

The app treats a deployment as production only if it uses the production
Supabase project.

- **Email (Resend)**: sent only to `APOLLO_NONPRODUCTION_EMAIL_ALLOWLIST`
  (comma-separated addresses or `@domain` entries). Empty = no email.
- **SMS (Twilio)**: refused.
- **CAD**: refused unless `APOLLO_ALLOW_NONPRODUCTION_CAD=true` (only for a
  non-production CAD instance).

Do not give Preview the production `SUPABASE_SERVICE_ROLE_KEY`, Resend,
Twilio, CAD or `CRON_SECRET` values.

## Preview environment variables (Vercel → Settings → Environment Variables → Preview)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://eejahcuftznsabulssew.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | staging publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **staging** service role key |
| `APOLLO_OWNER_EMAILS` | your login email |
| `APOLLO_NONPRODUCTION_EMAIL_ALLOWLIST` | e.g. `@example.test` or your address |

## Staging Supabase authentication

1. Authentication → Providers → Google: enable, using your Google OAuth client.
2. Google Cloud Console → that OAuth client → Authorized redirect URIs: add
   `https://eejahcuftznsabulssew.supabase.co/auth/v1/callback`.
3. Authentication → URL Configuration (staging project only):
   - Site URL: your Preview URL.
   - Redirect URLs: `https://*-<your-vercel-team>.vercel.app/**` and
     `http://localhost:3000/**`.

   Do not add Preview URLs to the production project.

## Local development

Copy `.env.example` to `.env.local` and fill in staging values. A local build or
`npm run dev` without them fails on purpose.
