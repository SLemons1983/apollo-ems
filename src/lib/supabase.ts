import { createBrowserClient } from '@supabase/ssr';
import { supabaseUrl, supabasePublishableKey } from '@/lib/supabaseConfig';

export const supabase = createBrowserClient(
  supabaseUrl,
  supabasePublishableKey,
);
