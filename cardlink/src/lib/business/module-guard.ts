import type { SupabaseClient } from "@supabase/supabase-js";

export type ModuleKey =
  | "accounting"
  | "pos"
  | "procurement"
  | "crm"
  | "inventory"
  | "hr"
  | "booking"
  | "store"
  | "cards"
  | "client";

export async function isModuleEnabled(
  supabase: SupabaseClient,
  companyId: string,
  moduleKey: ModuleKey,
): Promise<boolean> {
  const { data } = await supabase
    .from("company_modules")
    .select("enabled")
    .eq("company_id", companyId)
    .eq("module_key", moduleKey)
    .maybeSingle();

  return data?.enabled === true;
}
