import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';

const URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const KEY = 'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU';

export async function POST(request: NextRequest) {
  const access = await currentEpcrMembership();
  if (!access) return NextResponse.json({ error: 'ePCR account required.' }, { status: 401 });

  let agencyId = access.membership.agency_id;
  try {
    const body = await request.json() as { agency_id?: unknown };
    if (body.agency_id) agencyId = String(body.agency_id);
  } catch {
    // Existing callers may POST without a JSON body.
  }

  const allowed = access.memberships.some((membership) => membership.agency_id === agencyId);
  if (!allowed) return NextResponse.json({ error: 'You do not have ePCR access to that agency.' }, { status: 403 });

  const selected = access.memberships.find((membership) => membership.agency_id === agencyId);
  if (selected?.status === 'INVITED') {
    const acceptedAt = new Date().toISOString();
    await epcrAdminClient().from('epcr_memberships').update({ status: 'ACTIVE', accepted_at: acceptedAt }).eq('id', selected.id).eq('status', 'INVITED');
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('apollo_epcr_session', access.user.id, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 12 });
  response.cookies.set('apollo_epcr_agency', agencyId, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 12 });
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
  response.cookies.set('apollo_epcr_agency', '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 0 });
  return response;
}
