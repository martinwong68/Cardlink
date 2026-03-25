import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

type MembershipAccountRow = {
  id: string;
  user_id: string;
  status: string;
  tier_id: string | null;
  points_balance: number | null;
  total_spend_amount: number | null;
  lifetime_points: number | null;
  joined_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type MembershipTierRow = {
  id: string;
  name: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_SEARCH_CHARS_REGEX = /^[a-zA-Z0-9@.+_-]+$/;

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ accounts: [] });
  }
  if (q.length > 120) {
    return NextResponse.json(
      { error: "Query parameter q exceeds maximum length of 120 characters." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const isUserIdLookup = UUID_REGEX.test(q);
  const sanitizedSearch = q.replace(/[%_]/g, "").trim();
  if (!isUserIdLookup && !EMAIL_SEARCH_CHARS_REGEX.test(sanitizedSearch)) {
    return NextResponse.json({ accounts: [] });
  }
  if (!isUserIdLookup && sanitizedSearch.length < 2) {
    return NextResponse.json({ accounts: [] });
  }

  let matchedUserIds: string[] = [];
  const { data: profileMatches, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", `%${sanitizedSearch}%`)
    .limit(50);

  if (profileLookupError) {
    return NextResponse.json({ error: profileLookupError.message }, { status: 500 });
  }

  matchedUserIds = (profileMatches ?? [])
    .map((row: { id: string }) => row.id)
    .filter(Boolean);

  const accountMap = new Map<string, MembershipAccountRow>();

  if (isUserIdLookup) {
    const { data: byUserIdData, error: byUserIdError } = await supabase
      .from("membership_accounts")
      .select("id, user_id, status, tier_id, points_balance, total_spend_amount, lifetime_points, joined_at")
      .eq("company_id", companyId)
      .eq("user_id", q)
      .order("joined_at", { ascending: false })
      .limit(50);

    if (byUserIdError) {
      return NextResponse.json({ error: byUserIdError.message }, { status: 500 });
    }

    for (const account of (byUserIdData ?? []) as MembershipAccountRow[]) {
      accountMap.set(account.id, account);
    }
  }

  if (matchedUserIds.length > 0) {
    const { data: byEmailData, error: byEmailError } = await supabase
      .from("membership_accounts")
      .select("id, user_id, status, tier_id, points_balance, total_spend_amount, lifetime_points, joined_at")
      .eq("company_id", companyId)
      .in("user_id", matchedUserIds)
      .order("joined_at", { ascending: false })
      .limit(50);

    if (byEmailError) {
      return NextResponse.json({ error: byEmailError.message }, { status: 500 });
    }

    for (const account of (byEmailData ?? []) as MembershipAccountRow[]) {
      accountMap.set(account.id, account);
    }
  }

  const accounts = Array.from(accountMap.values());
  if (accounts.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  const userIds = accounts.map((a) => a.user_id);
  const tierIds = Array.from(new Set(accounts.map((a) => a.tier_id).filter(Boolean))) as string[];

  const [profilesRes, tiersRes] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, avatar_url").in("id", userIds),
    tierIds.length > 0
      ? supabase.from("membership_tiers").select("id, name").in("id", tierIds)
      : Promise.resolve({ data: [] as MembershipTierRow[], error: null }),
  ]);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }

  if (tiersRes.error) {
    return NextResponse.json({ error: tiersRes.error.message }, { status: 500 });
  }

  const profileMap = new Map<string, ProfileRow>();
  for (const profile of (profilesRes.data ?? []) as ProfileRow[]) {
    profileMap.set(profile.id, profile);
  }

  const tierMap = new Map<string, string>();
  for (const tier of (tiersRes.data ?? []) as MembershipTierRow[]) {
    tierMap.set(tier.id, tier.name);
  }

  const getJoinedAtMs = (value: string | null) => {
    if (!value) return 0;
    const ts = new Date(value).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  };

  const responseAccounts = accounts
    .sort((a, b) => getJoinedAtMs(b.joined_at) - getJoinedAtMs(a.joined_at))
    .map((account) => {
      const profile = profileMap.get(account.user_id);
      return {
        id: account.id,
        user_id: account.user_id,
        email: profile?.email ?? null,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        status: account.status,
        tier_name: account.tier_id ? (tierMap.get(account.tier_id) ?? null) : null,
        points_balance: account.points_balance ?? 0,
        total_spend_amount: account.total_spend_amount ?? 0,
        lifetime_points: account.lifetime_points ?? 0,
        joined_at: account.joined_at,
      };
    });

  return NextResponse.json({ accounts: responseAccounts });
}
