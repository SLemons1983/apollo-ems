import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';

async function syncEmployeeAuthProfile(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  identities?: Array<{
    provider?: string | null;
    identity_data?: Record<string, unknown>;
  }> | null;
}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = String(user.email ?? '').trim();

  if (!serviceRoleKey || !email) {
    return;
  }

  const metadata = user.user_metadata ?? {};
  const appMetadata = user.app_metadata ?? {};
  const identityData = user.identities?.[0]?.identity_data ?? {};
  const photoUrl = String(
    metadata.avatar_url ??
    metadata.picture ??
    metadata.picture_url ??
    identityData.avatar_url ??
    identityData.picture ??
    identityData.picture_url ??
    '',
  ).trim();
  const authProvider = String(appMetadata.provider ?? user.identities?.[0]?.provider ?? 'google').trim();

  const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey);

  const { error } = await supabaseAdmin
    .from('employees')
    .update({
      photo_url: photoUrl || null,
      last_login_at: new Date().toISOString(),
      auth_provider: authProvider || 'google',
    })
    .ilike('email', email);

  if (error) {
    console.error('Failed to sync employee auth profile:', error);
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  const response = NextResponse.redirect(new URL(next, request.url));

  if (code) {
    const supabase = createServerClient(
      'https://xyrusrspvyuwpplhhett.supabase.co',
      'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await syncEmployeeAuthProfile(user);
    }
  }

  return response;
}
