import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { isPlatformOwner } from '@/lib/platformOwner';
import { supabaseUrl, supabasePublishableKey } from '@/lib/supabaseConfig';

const SUPABASE_URL = supabaseUrl;
const PUBLISHABLE_KEY = supabasePublishableKey;

export async function getOwnerAdminClient() {
  const cookieStore = await cookies();
  const auth = createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email || !isPlatformOwner(user.email)) return null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return { user, db: createClient(SUPABASE_URL, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }) };
}
