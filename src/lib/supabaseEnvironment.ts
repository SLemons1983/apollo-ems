// Which Supabase project each deployment may use. Pure and dependency-free:
// it runs inside next.config.ts at build time and in unit tests.
//
// Rules (enforced when the app is built, so a misconfigured deployment fails
// to build instead of silently reaching the wrong database):
//   * production   -> must use the production project. Any Supabase variable
//                     that is not set falls back to the production value below
//                     (as the app did before), so existing Production
//                     environment variables never break the build. The legacy
//                     NEXT_PUBLIC_SUPABASE_ANON_KEY is ignored in production.
//   * preview, development, local -> must set NEXT_PUBLIC_SUPABASE_URL and
//                     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and may NEVER point
//                     at the production project.

import { getSupabaseProjectRef, PRODUCTION_SUPABASE_PROJECT_REF } from './supabaseProject';

export { getSupabaseProjectRef, PRODUCTION_SUPABASE_PROJECT_REF };
export const PRODUCTION_SUPABASE_URL = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;
// Publishable (browser) key: public by design and already shipped to browsers.
export const PRODUCTION_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU';

export type DeploymentEnvironment = 'production' | 'preview' | 'development' | 'local';

type Env = Record<string, string | undefined>;

const ENVIRONMENTS: readonly DeploymentEnvironment[] = ['production', 'preview', 'development', 'local'];

/**
 * APOLLO_DEPLOYMENT_ENVIRONMENT (explicit) wins; otherwise Vercel's VERCEL_ENV;
 * otherwise 'local'. An unrecognised value is an error, never a guess.
 */
export function getDeploymentEnvironment(env: Env): DeploymentEnvironment {
  const explicit = env.APOLLO_DEPLOYMENT_ENVIRONMENT?.trim().toLowerCase();
  if (explicit) {
    if ((ENVIRONMENTS as readonly string[]).includes(explicit)) return explicit as DeploymentEnvironment;
    throw new Error(`APOLLO_DEPLOYMENT_ENVIRONMENT must be one of ${ENVIRONMENTS.join(', ')}; got "${explicit}".`);
  }
  const vercel = env.VERCEL_ENV?.trim().toLowerCase();
  if (vercel === 'production' || vercel === 'preview' || vercel === 'development') return vercel;
  return 'local';
}

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
  projectRef: string | null;
  deploymentEnvironment: DeploymentEnvironment;
  usedProductionDefaults: boolean;
};

export function resolveSupabasePublicConfig(env: Env): SupabasePublicConfig {
  const deploymentEnvironment = getDeploymentEnvironment(env);
  const isProduction = deploymentEnvironment === 'production';
  let url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  let publishableKey =
    (isProduction ? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim() ?? '';
  let usedProductionDefaults = false;

  if (isProduction && !url) {
    url = PRODUCTION_SUPABASE_URL;
    usedProductionDefaults = true;
  }
  if (isProduction && !publishableKey) {
    publishableKey = PRODUCTION_SUPABASE_PUBLISHABLE_KEY;
    usedProductionDefaults = true;
  }

  if (!url || !publishableKey) {
    throw new Error(
      `Supabase is not configured for the ${deploymentEnvironment} environment. Set both ` +
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see docs/preview-and-staging.md).',
    );
  }

  const projectRef = getSupabaseProjectRef(url);

  if (deploymentEnvironment !== 'production' && projectRef === PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error(
      `Refusing to build a ${deploymentEnvironment} deployment against the PRODUCTION Supabase project. ` +
        'Point NEXT_PUBLIC_SUPABASE_URL at the staging project.',
    );
  }

  if (deploymentEnvironment === 'production' && projectRef !== PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error(
      'Refusing to build the production deployment against a non-production Supabase project ' +
        `(${projectRef ?? url}). Check the Production environment variables.`,
    );
  }

  return { url, publishableKey, projectRef, deploymentEnvironment, usedProductionDefaults };
}
