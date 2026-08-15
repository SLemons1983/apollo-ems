import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://xyrusrspvyuwpplhhett.supabase.co";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU";

export async function requireMdtUser() {
  const cookieStore = await cookies();
  const auth = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll() {},
    },
  });
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email) throw new Error("UNAUTHORIZED");
  return user;
}

export function mdtAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isSupervisor(role?: string | null, jobTitle?: string | null) {
  const value = `${role ?? ""} ${jobTitle ?? ""}`.toLowerCase();
  return value.includes("supervisor") || value.includes("admin") || value.includes("general manager") || value.includes(" gm ");
}
