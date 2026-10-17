import { createHmac, timingSafeEqual } from 'node:crypto';

export const DISPATCH_COOKIE = 'apollo_dispatch_session';
export const DISPATCH_SESSION_SECONDS = 12 * 60 * 60;

// Set APOLLO_DISPATCH_USERNAME and APOLLO_DISPATCH_PASSWORD in Vercel to change
// the dispatch login. Until then the original login keeps working, but it is
// no longer sent to the browser.
function dispatchCredentials() {
  return {
    username: process.env.APOLLO_DISPATCH_USERNAME?.trim() || 'Dispatch',
    password: process.env.APOLLO_DISPATCH_PASSWORD || 'Sequoia',
  };
}

// Sessions are signed with the server's secret key plus the dispatch password,
// so changing the password signs everyone out.
function signingKey() {
  const serverSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serverSecret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return `${serverSecret}:${dispatchCredentials().password}`;
}

function sameText(a: string, b: string) {
  const left = createHmac('sha256', 'compare').update(a).digest();
  const right = createHmac('sha256', 'compare').update(b).digest();
  return timingSafeEqual(left, right);
}

function signature(expiresAt: string) {
  return createHmac('sha256', signingKey()).update(`dispatch.${expiresAt}`).digest('hex');
}

export function dispatchCredentialsMatch(username: string, password: string) {
  const expected = dispatchCredentials();
  const usernameOk = sameText(username.trim(), expected.username);
  const passwordOk = sameText(password, expected.password);
  return usernameOk && passwordOk;
}

export function createDispatchSession(now = Date.now()) {
  const expiresAt = String(now + DISPATCH_SESSION_SECONDS * 1000);
  return `${expiresAt}.${signature(expiresAt)}`;
}

export function isValidDispatchSession(value: string | undefined, now = Date.now()) {
  if (!value) return false;
  const [expiresAt, supplied] = value.split('.');
  if (!expiresAt || !supplied || !/^\d+$/.test(expiresAt) || Number(expiresAt) < now) return false;
  return sameText(supplied, signature(expiresAt));
}
