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

export async function currentEpcrMembership() {
  const cookieStore = await cookies();
  const auth = createServerClient(URL, KEY, { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.id || !user.email) return null;
  const db = epcrAdminClient();
  const { data } = await db.from('epcr_memberships').select('*, apollo_agencies(name,slug,enabled_modules,status)').eq('auth_user_id', user.id).in('status', ['INVITED', 'ACTIVE']).maybeSingle();
  if (!data) return null;
  if (data.status === 'INVITED') {
    const acceptedAt = new Date().toISOString();
    await db.from('epcr_memberships').update({ status: 'ACTIVE', accepted_at: acceptedAt }).eq('id', data.id).eq('status', 'INVITED');
    data.status = 'ACTIVE'; data.accepted_at = acceptedAt;
  }
  return { user, membership: data };
}
