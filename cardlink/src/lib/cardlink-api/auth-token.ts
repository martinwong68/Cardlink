import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve Supabase access token for Geekbobo-backend Bearer auth. */
export async function getSupabaseAccessToken(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return null;
  }
  return data.session?.access_token ?? null;
}
