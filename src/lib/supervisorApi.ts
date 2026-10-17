import { createServerClient } from '@supabase/ssr';
import { createClient, type User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseUrl, supabasePublishableKey } from '@/lib/supabaseConfig';
import { isPlatformOwner } from '@/lib/platformOwner';

const SUPABASE_URL = supabaseUrl;
const PUBLISHABLE_KEY = supabasePublishableKey;

export type ApiEmployee = {
  id: string;
  email: string | null;
  role: string | null;
  job_title: string | null;
  status: string | null;
};

export function supervisorRole(role: string | null, jobTitle: string | null) {
  const normalizedRole = (role ?? '').trim().toLowerCase();
  const normalizedJobTitle = (jobTitle ?? '').trim().toLowerCase();
  return normalizedRole === 'supervisor' || normalizedRole === 'admin' || normalizedRole === 'gm' ||
    normalizedJobTitle.includes('supervisor') || normalizedJobTitle.includes('admin') || normalizedJobTitle.includes('general manager');
}

// Accepts either a Bearer access token (used by a few pages) or the signed-in
// Supabase session cookie that the browser sends with same-origin fetches.
async function signedInUser(request: NextRequest): Promise<User | null> {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

  if (accessToken) {
    const auth = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await auth.auth.getUser(accessToken);
    return error ? null : data.user;
  }

  const auth = createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: { getAll: () => request.cookies.getAll(), setAll() {} },
  });
  const { data, error } = await auth.auth.getUser();
  return error ? null : data.user;
}

function serviceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return createClient(SUPABASE_URL, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Any active employee. Throws SUPERVISOR_API_UNAUTHORIZED / SUPERVISOR_API_FORBIDDEN. */
export async function requireEmployeeApi(request: NextRequest) {
  const user = await signedInUser(request);
  const email = user?.email?.trim().toLowerCase() ?? '';
  if (!user || !email) throw new Error('SUPERVISOR_API_UNAUTHORIZED');

  const db = serviceClient();
  const { data: employee, error: employeeError } = await db
    .from('employees')
    .select('id,email,role,job_title,status')
    .ilike('email', email)
    .maybeSingle<ApiEmployee>();
  const active = (employee?.status ?? '').trim().toLowerCase() === 'active';
  if (employeeError || !employee || !active) throw new Error('SUPERVISOR_API_FORBIDDEN');

  return { user, employee, db, isSupervisor: supervisorRole(employee.role, employee.job_title) };
}

/** An active supervisor, admin or GM. */
export async function requireSupervisorApi(request: NextRequest) {
  const access = await requireEmployeeApi(request);
  if (!access.isSupervisor) throw new Error('SUPERVISOR_API_FORBIDDEN');
  return access;
}

/** A platform owner (APOLLO_OWNER_EMAILS). */
export async function requirePlatformOwnerApi(request: NextRequest) {
  const user = await signedInUser(request);
  if (!user?.email) throw new Error('SUPERVISOR_API_UNAUTHORIZED');
  if (!isPlatformOwner(user.email)) throw new Error('SUPERVISOR_API_FORBIDDEN');
  return { user };
}

/** The 401/403 response for an access error above, or null for any other error. */
export function apiAuthErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'SUPERVISOR_API_UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (message === 'SUPERVISOR_API_FORBIDDEN') return NextResponse.json({ error: 'You do not have access to this.' }, { status: 403 });
  return null;
}

/**
 * Route guard: returns the caller's access, or the 401/403/500 response to send.
 * `const access = await checkApiAccess(request, 'supervisor'); if (access instanceof NextResponse) return access;`
 */
export async function checkApiAccess(request: NextRequest, level: 'employee' | 'supervisor') {
  try {
    return level === 'supervisor' ? await requireSupervisorApi(request) : await requireEmployeeApi(request);
  } catch (error) {
    const response = apiAuthErrorResponse(error);
    if (response) return response;
    console.error('API access check failed:', error);
    return NextResponse.json({ error: 'Unable to verify access.' }, { status: 500 });
  }
}
