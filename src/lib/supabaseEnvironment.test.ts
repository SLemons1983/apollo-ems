import { describe, expect, it } from 'vitest';
import { filterNonProductionRecipients } from './nonProductionSafety';
import {
  getDeploymentEnvironment,
  getSupabaseProjectRef,
  PRODUCTION_SUPABASE_PROJECT_REF,
  PRODUCTION_SUPABASE_URL,
  resolveSupabasePublicConfig,
} from './supabaseEnvironment';

const STAGING_URL = 'https://eejahcuftznsabulssew.supabase.co';
const STAGING_KEY = 'sb_publishable_synthetic-staging-key';

describe('getDeploymentEnvironment', () => {
  it('uses the explicit setting first, then Vercel, then local', () => {
    expect(getDeploymentEnvironment({ APOLLO_DEPLOYMENT_ENVIRONMENT: 'Preview', VERCEL_ENV: 'production' })).toBe('preview');
    expect(getDeploymentEnvironment({ VERCEL_ENV: 'production' })).toBe('production');
    expect(getDeploymentEnvironment({ VERCEL_ENV: 'preview' })).toBe('preview');
    expect(getDeploymentEnvironment({})).toBe('local');
    expect(getDeploymentEnvironment({ VERCEL_ENV: 'something-else' })).toBe('local');
  });

  it('rejects an unrecognised explicit environment instead of guessing', () => {
    expect(() => getDeploymentEnvironment({ APOLLO_DEPLOYMENT_ENVIRONMENT: 'prod' })).toThrow(/must be one of/);
  });
});

describe('getSupabaseProjectRef', () => {
  it('extracts the project reference from Supabase URLs only', () => {
    expect(getSupabaseProjectRef(PRODUCTION_SUPABASE_URL)).toBe(PRODUCTION_SUPABASE_PROJECT_REF);
    expect(getSupabaseProjectRef(`${STAGING_URL}/`)).toBe('eejahcuftznsabulssew');
    expect(getSupabaseProjectRef('https://XYRUSRSPVYUWPPLHHETT.supabase.co')).toBe(PRODUCTION_SUPABASE_PROJECT_REF);
    expect(getSupabaseProjectRef('https://xyrusrspvyuwpplhhett.supabase.co.evil.example')).toBeNull();
    expect(getSupabaseProjectRef('not a url')).toBeNull();
    expect(getSupabaseProjectRef('')).toBeNull();
  });
});

describe('resolveSupabasePublicConfig', () => {
  it('keeps production working unchanged when no Supabase variables are set', () => {
    const config = resolveSupabasePublicConfig({ VERCEL_ENV: 'production' });
    expect(config.url).toBe(PRODUCTION_SUPABASE_URL);
    expect(config.publishableKey).toMatch(/^sb_publishable_/);
    expect(config.usedProductionDefaults).toBe(true);
  });

  it('accepts explicit production variables pointing at production', () => {
    const config = resolveSupabasePublicConfig({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: PRODUCTION_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_explicit',
    });
    expect(config.usedProductionDefaults).toBe(false);
    expect(config.publishableKey).toBe('sb_publishable_explicit');
  });

  it('refuses to point production at any other project', () => {
    expect(() =>
      resolveSupabasePublicConfig({ VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: STAGING_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: STAGING_KEY }),
    ).toThrow(/production deployment against a non-production/);
  });

  it.each(['preview', 'development', 'local'])('a %s build must be configured explicitly', (environment) => {
    expect(() => resolveSupabasePublicConfig({ APOLLO_DEPLOYMENT_ENVIRONMENT: environment })).toThrow(/not configured/);
  });

  it.each(['preview', 'development', 'local'])('a %s build can never use the production project', (environment) => {
    for (const url of [PRODUCTION_SUPABASE_URL, `${PRODUCTION_SUPABASE_URL}/`, 'https://XYRUSRSPVYUWPPLHHETT.supabase.co']) {
      expect(() =>
        resolveSupabasePublicConfig({
          APOLLO_DEPLOYMENT_ENVIRONMENT: environment,
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_any',
        }),
      ).toThrow(/PRODUCTION Supabase project/);
    }
  });

  it('a preview build with staging values is accepted', () => {
    const config = resolveSupabasePublicConfig({
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_SUPABASE_URL: STAGING_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: STAGING_KEY,
    });
    expect(config).toMatchObject({ deploymentEnvironment: 'preview', projectRef: 'eejahcuftznsabulssew', usedProductionDefaults: false });
  });

  it('production fills any missing variable with the production value', () => {
    const urlOnly = resolveSupabasePublicConfig({ VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: `${PRODUCTION_SUPABASE_URL}/` });
    expect(urlOnly.publishableKey).toMatch(/^sb_publishable_Pprc/);
    const keyOnly = resolveSupabasePublicConfig({ VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_explicit' });
    expect(keyOnly).toMatchObject({ url: PRODUCTION_SUPABASE_URL, publishableKey: 'sb_publishable_explicit' });
  });

  it('production ignores a leftover legacy anon key variable', () => {
    const config = resolveSupabasePublicConfig({ VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJ-legacy' });
    expect(config).toMatchObject({ url: PRODUCTION_SUPABASE_URL, publishableKey: expect.stringMatching(/^sb_publishable_Pprc/) });
  });

  it('a partial configuration is rejected outside production', () => {
    expect(() => resolveSupabasePublicConfig({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: STAGING_URL })).toThrow(/not configured/);
    expect(() => resolveSupabasePublicConfig({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: STAGING_KEY })).toThrow(/not configured/);
  });

  it('accepts the legacy anon key variable name', () => {
    const config = resolveSupabasePublicConfig({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: STAGING_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: STAGING_KEY });
    expect(config.publishableKey).toBe(STAGING_KEY);
  });
});

describe('filterNonProductionRecipients', () => {
  it('blocks everyone when no allowlist is configured', () => {
    expect(filterNonProductionRecipients(['employee@apolloems.org', 'qa@example.test'], undefined)).toEqual([]);
    expect(filterNonProductionRecipients(['qa@example.test'], '')).toEqual([]);
  });

  it('allows only listed addresses and domains', () => {
    expect(
      filterNonProductionRecipients(
        ['QA@Example.test', 'support@apolloems.org', 'tester@staging.example', 'someone@example.test.evil.com'],
        ' @example.test , tester@staging.example ',
      ),
    ).toEqual(['QA@Example.test', 'tester@staging.example']);
  });
});
