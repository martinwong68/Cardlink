import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/src/lib/supabase/client";

export function useActiveCompany() {
  const supabase = useMemo(() => createClient(), []);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_active_company_id")
      .eq("id", user.id)
      .single();

    if (profile?.business_active_company_id) {
      setCompanyId(profile.business_active_company_id as string);
    } else {
      // Fallback: get first company user is a member of
      const { data: membership } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .in("role", ["owner", "admin"])
        .limit(1)
        .maybeSingle();
      if (membership) setCompanyId(membership.company_id as string);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  return { companyId, loading, supabase };
}
