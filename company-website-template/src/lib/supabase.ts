import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client for direct database access (read-only via RLS).
 * Uses the same Supabase project as the Cardlink app.
 * The anon key only exposes data allowed by public RLS policies.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env.local and fill in your Supabase credentials."
    );
  }

  return createSupabaseClient(url, key);
}
