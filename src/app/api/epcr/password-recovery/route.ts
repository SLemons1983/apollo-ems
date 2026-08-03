import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU';

function serverClient(request: NextRequest, response: NextResponse) {
  return createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const body = await request.json().catch(() => ({})) as { email?: unknown };
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const supabase = serverClient(request, response);
  const redirectTo = `${origin}/auth/callback?flow=epcr-recovery&next=${encodeURIComponent('/epcr-account/setup-password?server_recovery=1')}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return response;
}

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const recoveryUserId = request.cookies.get('apollo_epcr_recovery')?.value;
  response.cookies.set('apollo_epcr_recovery', '', { httpOnly: true, maxAge: 0, path: '/' });
  if (!recoveryUserId) {
    return NextResponse.json({ error: 'Recovery verification is missing or expired.' }, { status: 401 });
  }

  const supabase = serverClient(request, response);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.id !== recoveryUserId) {
    return NextResponse.json({ error: 'Recovery verification is invalid.' }, { status: 401 });
  }
  return response;
}
