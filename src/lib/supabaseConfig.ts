import { getSupabaseProjectRef, PRODUCTION_SUPABASE_PROJECT_REF } from './supabaseProject';

// Supabase connection settings for the whole app. next.config.ts resolves and
// validates them at build time (resolveSupabasePublicConfig) and inlines them,
// so every server route, the middleware and the browser use the same project.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/**
 * True only for the production Supabase project. The build refuses to pair a
 * non-production deployment with the production project, so this also marks
 * the production deployment; live integrations (email, SMS, CAD) key off it.
 */
export const isProductionSupabaseProject = getSupabaseProjectRef(supabaseUrl) === PRODUCTION_SUPABASE_PROJECT_REF;
