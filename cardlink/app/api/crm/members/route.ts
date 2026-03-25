import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/**
 * GET /api/crm/members
 * Returns the list of company members for the active company.
 */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  const { data, error } = await supabase
    .from("company_members")
    .select("user_id, role, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch user profiles for each member
  const userIds = (data ?? []).map((m: { user_id: string }) => m.user_id);

  let profiles: Record<string, { email?: string; full_name?: string; avatar_url?: string }> = {};
  if (userIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .in("id", userIds);

    if (profileData) {
      for (const p of profileData) {
        profiles[p.id] = { email: p.email, full_name: p.full_name, avatar_url: p.avatar_url };
      }
    }
  }

  const members = (data ?? []).map((m: { user_id: string; role: string; created_at: string }) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.created_at,
    email: profiles[m.user_id]?.email ?? null,
    full_name: profiles[m.user_id]?.full_name ?? null,
    avatar_url: profiles[m.user_id]?.avatar_url ?? null,
  }));

  return NextResponse.json({ members });
}
