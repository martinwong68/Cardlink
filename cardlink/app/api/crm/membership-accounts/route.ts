import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/**
 * GET /api/crm/membership-accounts
 * Returns customer membership accounts for the active company.
 */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  const { data, error } = await supabase
    .from("membership_accounts")
    .select("id, user_id, status, tier_id, points_balance, total_spend_amount, lifetime_points, joined_at, expires_at")
    .eq("company_id", companyId)
    .order("joined_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  // Collect unique user IDs and tier IDs
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const tierIds = Array.from(new Set(rows.map((r) => r.tier_id).filter(Boolean))) as string[];

  // Fetch profiles
  const profiles: Record<string, { email: string | null; full_name: string | null; avatar_url: string | null }> = {};
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

  // Fetch tiers
  const tiers: Record<string, string> = {};
  if (tierIds.length > 0) {
    const { data: tierData } = await supabase
      .from("membership_tiers")
      .select("id, name")
      .in("id", tierIds);

    if (tierData) {
      for (const t of tierData) {
        tiers[t.id] = t.name;
      }
    }
  }

  const accounts = rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    email: profiles[r.user_id]?.email ?? null,
    full_name: profiles[r.user_id]?.full_name ?? null,
    avatar_url: profiles[r.user_id]?.avatar_url ?? null,
    status: r.status,
    tier_name: r.tier_id ? (tiers[r.tier_id] ?? null) : null,
    points_balance: r.points_balance ?? 0,
    total_spend_amount: Number(r.total_spend_amount ?? 0),
    lifetime_points: r.lifetime_points ?? 0,
    joined_at: r.joined_at,
    expires_at: r.expires_at,
  }));

  return NextResponse.json({ accounts, total: accounts.length });
}
