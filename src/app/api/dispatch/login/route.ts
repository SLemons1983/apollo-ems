import { NextRequest, NextResponse } from 'next/server';
import {
  createDispatchSession,
  DISPATCH_COOKIE,
  DISPATCH_SESSION_SECONDS,
  dispatchCredentialsMatch,
} from '@/lib/dispatchSession';

export async function POST(request: NextRequest) {
  let username = '';
  let password = '';
  try {
    const body = await request.json();
    username = String(body.username ?? '');
    password = String(body.password ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 400 });
  }

  if (!dispatchCredentialsMatch(username, password)) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DISPATCH_COOKIE, createDispatchSession(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DISPATCH_SESSION_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DISPATCH_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
