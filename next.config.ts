import type { NextConfig } from "next";
import { resolveSupabasePublicConfig } from "./src/lib/supabaseEnvironment";

// Fails the build if a non-production deployment would use the production
// Supabase project (or production would use any other project).
const supabase = resolveSupabasePublicConfig(process.env);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabase.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
    NEXT_PUBLIC_APOLLO_DEPLOYMENT_ENV: supabase.deploymentEnvironment,
  },
  async rewrites() {
    return [
      { source: "/epcr/login", destination: "/epcr-account/login" },
      { source: "/epcr/setup-password", destination: "/epcr-account/setup-password" },
      { source: "/epcr/dashboard", destination: "/epcr-dashboard" },
    ];
  },
};

export default nextConfig;
