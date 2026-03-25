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
/** Matches a valid card slug: 2-120 chars, alphanumeric plus . _ - */
const SLUG_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,118}[a-zA-Z0-9]$/;

/**
 * Try to extract a card slug from a namecard QR URL like /c/{slug}
 * Returns the slug if found, null otherwise.
 */
function extractSlugFromUrl(input: string): string | null {
  try {
    const parsed = new URL(input);
    const match = parsed.pathname.match(/^\/c\/([^/]+)$/);
    if (match?.[1]) return match[1];
  } catch {
    // not a URL
  }
  return null;
}

/**
 * Shared helper: look up membership accounts for given user_ids in a company,
 * enrich with profile + tier info, and return JSON response.
 */
async function lookupByUserIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  const { data: accountData, error: accountError } = await supabase
    .from("membership_accounts")
    .select("id, user_id, status, tier_id, points_balance, total_spend_amount, lifetime_points, joined_at")
    .eq("company_id", companyId)
    .in("user_id", userIds)
    .order("joined_at", { ascending: false })
    .limit(50);

  if (accountError) {
    return NextResponse.json({ error: accountError.message }, { status: 500 });
  }

  const accounts = (accountData ?? []) as MembershipAccountRow[];
  if (accounts.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  const allUserIds = accounts.map((a) => a.user_id);
  const tierIds = Array.from(new Set(accounts.map((a) => a.tier_id).filter(Boolean))) as string[];

  const [profilesRes, tiersRes] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, avatar_url").in("id", allUserIds),
    tierIds.length > 0
      ? supabase.from("membership_tiers").select("id, name").in("id", tierIds)
      : Promise.resolve({ data: [] as MembershipTierRow[], error: null }),
  ]);

  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  if (tiersRes.error) return NextResponse.json({ error: tiersRes.error.message }, { status: 500 });

  const profileMap = new Map<string, ProfileRow>();
  for (const p of (profilesRes.data ?? []) as ProfileRow[]) profileMap.set(p.id, p);

  const tierMap = new Map<string, string>();
  for (const t of (tiersRes.data ?? []) as MembershipTierRow[]) tierMap.set(t.id, t.name);

  const getJoinedAtMs = (v: string | null) => {
    if (!v) return 0;
    const ts = new Date(v).getTime();
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

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ accounts: [] });
  }
  if (q.length > 500) {
    return NextResponse.json(
      { error: "Query parameter q exceeds maximum length." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  // 1) Check if q is a namecard QR URL (e.g. https://app.example.com/c/john-smith)
  const slugFromUrl = extractSlugFromUrl(q);
  if (slugFromUrl) {
    // Resolve slug → user_id via business_cards table
    const { data: cardRow } = await supabase
      .from("business_cards")
      .select("user_id")
      .eq("slug", slugFromUrl)
      .maybeSingle();

    if (cardRow?.user_id) {
      // Convert to user_id lookup
      return lookupByUserIds(supabase, companyId, [cardRow.user_id]);
    }
    return NextResponse.json({ accounts: [] });
  }

  const isUserIdLookup = UUID_REGEX.test(q);
  const sanitizedSearch = q.replace(/[%_]/g, "").trim();

  // 2) Check if q looks like a card slug (not an email, not a UUID)
  if (!isUserIdLookup && !sanitizedSearch.includes("@") && SLUG_REGEX.test(sanitizedSearch)) {
    const { data: cardRow } = await supabase
      .from("business_cards")
      .select("user_id")
      .eq("slug", sanitizedSearch)
      .maybeSingle();

    if (cardRow?.user_id) {
      return lookupByUserIds(supabase, companyId, [cardRow.user_id]);
    }
    // Fall through to email search
  }

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

  // Collect all unique user_ids from direct lookup + email matches
  const allUserIds: string[] = [];
  if (isUserIdLookup) allUserIds.push(q);
  for (const uid of matchedUserIds) {
    if (!allUserIds.includes(uid)) allUserIds.push(uid);
  }

  return lookupByUserIds(supabase, companyId, allUserIds);
}
