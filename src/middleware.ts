import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/employees', '/schedule', '/supervisor'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSupabaseCookie =
    request.cookies.has('sb-access-token') ||
    request.cookies.has('supabase-auth-token') ||
    Array.from(request.cookies.getAll()).some((cookie) =>
      cookie.name.startsWith('sb-')
    );

  if (!hasSupabaseCookie) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/employees/:path*', '/schedule/:path*', '/supervisor/:path*'],
};
