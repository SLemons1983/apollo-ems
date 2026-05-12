import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/employees', '/schedule', '/supervisor'];
const supervisorRoutes = ['/employees', '/schedule', '/supervisor'];

function isSupervisorRole(role?: string | null, jobTitle?: string | null): boolean {
  const normalizedRole = (role ?? '').trim().toLowerCase();
  const normalizedJobTitle = (jobTitle ?? '').trim().toLowerCase();

  return (
    normalizedRole === 'supervisor' ||
    normalizedRole === 'admin' ||
    normalizedRole === 'gm' ||
    normalizedJobTitle.includes('supervisor') ||
    normalizedJobTitle.includes('admin') ||
    normalizedJobTitle.includes('general manager')
  );
}

function routeMatches(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!routeMatches(pathname, protectedRoutes)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    'https://xyrusrspvyuwpplhhett.supabase.co',
    'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!routeMatches(pathname, supervisorRoutes)) {
    return response;
  }

  const { data: employee, error } = await supabase
    .from('employees')
    .select('role,job_title,status')
    .ilike('email', user.email)
    .maybeSingle();

  const isActive = (employee?.status ?? '').trim().toLowerCase() === 'active';
  const allowed = !error && isActive && isSupervisorRole(employee?.role, employee?.job_title);

  if (!allowed) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/employees/:path*', '/schedule/:path*', '/supervisor/:path*'],
};
