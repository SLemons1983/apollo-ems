import { afterEach, describe, expect, it, vi } from 'vitest';

// Simulates a Preview deployment (staging Supabase project) whose Vercel
// environment accidentally still contains production integration secrets.
// The guards must keep every live integration closed.

const STAGING_URL = 'https://eejahcuftznsabulssew.supabase.co';
const PRODUCTION_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';

async function loadWith(url: string, extra: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
  vi.stubEnv('RESEND_API_KEY', 're_leaked_production_key_for_test_only');
  for (const [key, value] of Object.entries(extra)) vi.stubEnv(key, value);
  const resendSend = vi.fn().mockResolvedValue({ data: { id: 'sent' }, error: null });
  vi.doMock('resend', () => ({ Resend: vi.fn(() => ({ emails: { send: resendSend } })) }));
  const email = await import('./email');
  const integration = await import('./integration-security');
  const config = await import('./supabaseConfig');
  return { email, integration, config, resendSend };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('resend');
});

describe('non-production deployment with leaked production secrets', () => {
  it('is recognised as non-production', async () => {
    const { config } = await loadWith(STAGING_URL);
    expect(config.isProductionSupabaseProject).toBe(false);
  });

  it('never emails real people (no allowlist configured)', async () => {
    const { email, resendSend } = await loadWith(STAGING_URL);
    const result = await email.sendApolloEmail({ to: 'employee@apolloems.org, support@apolloems.org', subject: 's', text: 't' });
    expect(result).toMatchObject({ skipped: true });
    expect(resendSend).not.toHaveBeenCalled();
  });

  it('emails only allowlisted test addresses', async () => {
    const { email, resendSend } = await loadWith(STAGING_URL, { APOLLO_NONPRODUCTION_EMAIL_ALLOWLIST: '@example.test' });
    await email.sendApolloEmail({ to: 'employee@apolloems.org, qa@example.test', subject: 's', text: 't' });
    expect(resendSend).toHaveBeenCalledTimes(1);
    expect(resendSend.mock.calls[0][0].to).toEqual(['qa@example.test']);
  });

  it('refuses to send anything to CAD', async () => {
    const { integration } = await loadWith(STAGING_URL);
    await expect(integration.signedPost('https://cad.example/api', 'apollo-mdt', 'secret', {})).rejects.toThrow(
      /disabled outside the production environment/,
    );
  });

  it('allows CAD only when a non-production CAD is explicitly enabled', async () => {
    const { integration } = await loadWith(STAGING_URL, { APOLLO_ALLOW_NONPRODUCTION_CAD: 'true' });
    // Network is blocked in tests, so reaching fetch proves the guard let it through.
    await expect(integration.signedPost('https://cad-staging.example/api', 'apollo-mdt', 'secret', {})).rejects.toThrow(/Network access is disabled/);
  });
});

describe('production deployment', () => {
  it('keeps email delivery unchanged', async () => {
    const { email, resendSend, config } = await loadWith(PRODUCTION_URL);
    expect(config.isProductionSupabaseProject).toBe(true);
    await email.sendApolloEmail({ to: 'employee@apolloems.org', subject: 's', text: 't' });
    expect(resendSend.mock.calls[0][0].to).toEqual(['employee@apolloems.org']);
  });
});
