import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDispatchSession, dispatchCredentialsMatch, isValidDispatchSession } from './dispatchSession';

describe('dispatch session', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-secret');
    vi.stubEnv('APOLLO_DISPATCH_USERNAME', 'Dispatch');
    vi.stubEnv('APOLLO_DISPATCH_PASSWORD', 'correct horse');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('checks the username and password on the server', () => {
    expect(dispatchCredentialsMatch('Dispatch', 'correct horse')).toBe(true);
    expect(dispatchCredentialsMatch('Dispatch', 'wrong')).toBe(false);
    expect(dispatchCredentialsMatch('Someone', 'correct horse')).toBe(false);
  });

  it('accepts its own signed session and rejects forged, edited or expired ones', () => {
    const now = Date.now();
    const session = createDispatchSession(now);
    expect(isValidDispatchSession(session, now)).toBe(true);
    expect(isValidDispatchSession('active', now)).toBe(false);
    expect(isValidDispatchSession(undefined, now)).toBe(false);
    const [expiresAt, signature] = session.split('.');
    expect(isValidDispatchSession(`${Number(expiresAt) + 1000}.${signature}`, now)).toBe(false);
    expect(isValidDispatchSession(`${expiresAt}.${'0'.repeat(signature.length)}`, now)).toBe(false);
    expect(isValidDispatchSession(session, Number(expiresAt) + 1)).toBe(false);
  });

  it('signs everyone out when the password changes', () => {
    const now = Date.now();
    const session = createDispatchSession(now);
    vi.stubEnv('APOLLO_DISPATCH_PASSWORD', 'new password');
    expect(isValidDispatchSession(session, now)).toBe(false);
  });
});
