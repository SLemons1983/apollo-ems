import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { currentEpcrMembership } from '@/lib/epcrServer';

const URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const KEY = 'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU';

export async function POST() {
  const access = await currentEpcrMembership();
  if (!access) return NextResponse.json({ error: 'ePCR account required.' }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set('apollo_epcr_session', access.user.id, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 12 });
  return response;
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const response = NextResponse.json({ ok: true });
  const auth = createServerClient(URL, KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) { values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); },
    },
  });
  if (request.nextUrl.searchParams.get('full') === '1') await auth.auth.signOut({ scope: 'local' });
  response.cookies.set('apollo_epcr_session', '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 0 });
  return response;
}
