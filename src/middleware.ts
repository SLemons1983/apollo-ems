import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/employees', '/schedule', '/supervisor', '/admin', '/ePCR', '/epcr/dashboard', '/epcr-dashboard', '/MDT'];
const supervisorRoutes = ['/employees', '/schedule', '/supervisor'];

function isPlatformOwner(email?: string | null): boolean {
  const ownerEmails = (process.env.APOLLO_OWNER_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(email && ownerEmails.includes(email.trim().toLowerCase()));
}

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

  if (pathname === '/epcr-dashboard') {
    return NextResponse.redirect(new URL('/epcr/dashboard', request.url));
  }

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
    const loginUrl = new URL('/login', request.url);
    if (routeMatches(pathname, ['/ePCR'])) return NextResponse.redirect(new URL('/epcr-account/login', request.url));
    if (routeMatches(pathname, ['/epcr/dashboard'])) return NextResponse.redirect(new URL('/epcr/login', request.url));
    if (routeMatches(pathname, ['/admin'])) loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (routeMatches(pathname, ['/admin'])) {
    if (!isPlatformOwner(user.email)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return response;
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
  matcher: ['/dashboard/:path*', '/employees/:path*', '/schedule/:path*', '/supervisor/:path*', '/admin/:path*', '/ePCR/:path*', '/epcr/dashboard/:path*', '/epcr-dashboard/:path*', '/MDT/:path*'],
};
