// Identifies Supabase projects. Imported at runtime by supabaseConfig.ts, so it
// must stay free of production connection values (those live only in
// supabaseEnvironment.ts, which is read by next.config.ts at build time).

export const PRODUCTION_SUPABASE_PROJECT_REF = 'xyrusrspvyuwpplhhett';

/** "<ref>.supabase.co" -> "<ref>"; null for anything else. */
export function getSupabaseProjectRef(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const match = new URL(url).hostname.toLowerCase().match(/^([a-z0-9]{20})\.supabase\.(co|in)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
