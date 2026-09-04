import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const KEY = 'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU';

export function epcrAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function currentEpcrMembership(requireDedicatedSession = false) {
  const cookieStore = await cookies();
  const auth = createServerClient(URL, KEY, { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.id || !user.email) return null;
  if (requireDedicatedSession && cookieStore.get('apollo_epcr_session')?.value !== user.id) return null;

  const db = epcrAdminClient();
  const { data } = await db
    .from('epcr_memberships')
    .select('*, apollo_agencies(name,slug,enabled_modules,status)')
    .eq('auth_user_id', user.id)
    .in('status', ['INVITED', 'ACTIVE'])
    .order('created_at', { ascending: true });

  if (!data?.length) return null;

  const selectedAgencyId = cookieStore.get('apollo_epcr_agency')?.value;
  const selected = data.find((membership) => membership.agency_id === selectedAgencyId) ?? data[0];

  if (selected.status === 'INVITED') {
    const acceptedAt = new Date().toISOString();
    await db.from('epcr_memberships').update({ status: 'ACTIVE', accepted_at: acceptedAt }).eq('id', selected.id).eq('status', 'INVITED');
    selected.status = 'ACTIVE';
    selected.accepted_at = acceptedAt;
  }

  return { user, membership: selected, memberships: data };
}
