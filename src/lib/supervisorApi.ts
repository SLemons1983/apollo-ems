import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xyrusrspvyuwpplhhett.supabase.co';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU';

function supervisorRole(role: string | null, jobTitle: string | null) {
  const normalizedRole = (role ?? '').trim().toLowerCase();
  const normalizedJobTitle = (jobTitle ?? '').trim().toLowerCase();
  return normalizedRole === 'supervisor' || normalizedRole === 'admin' || normalizedRole === 'gm' ||
    normalizedJobTitle.includes('supervisor') || normalizedJobTitle.includes('admin') || normalizedJobTitle.includes('general manager');
}

export async function requireSupervisorApi(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!accessToken) throw new Error('SUPERVISOR_API_UNAUTHORIZED');

  const auth = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.getUser(accessToken);
  const email = data.user?.email?.trim().toLowerCase() ?? '';
  if (error || !data.user || !email) throw new Error('SUPERVISOR_API_UNAUTHORIZED');

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  const db = createClient(SUPABASE_URL, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: employee, error: employeeError } = await db
    .from('employees')
    .select('id,email,role,job_title,status')
    .ilike('email', email)
    .maybeSingle();
  const active = (employee?.status ?? '').trim().toLowerCase() === 'active';
  if (employeeError || !employee || !active || !supervisorRole(employee.role, employee.job_title)) {
    throw new Error('SUPERVISOR_API_FORBIDDEN');
  }
  return { user: data.user, employee, db };
}
