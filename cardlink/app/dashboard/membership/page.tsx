import { getTranslations } from "next-intl/server";

import { createClient } from "@/src/lib/supabase/server";
import MembershipRedemptionsPanel from "@/components/MembershipRedemptionsPanel";

type MembershipAccountRow = {
  id: string;
  company_id: string;
  status: string;
  tier_id: string | null;
  total_spend_amount: number;
  points_balance: number;
  lifetime_points: number;
  joined_at: string;
  expires_at: string | null;
};

type CompanyRow = {
  id: string;
  name: string;
  slug: string | null;
};

type MembershipTierRow = {
  id: string;
  name: string;
};

export default async function MembershipPage() {
  const t = await getTranslations("membershipOverview");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: accountsData, error: accountsError } = user
    ? await supabase
        .from("membership_accounts")
        .select("id, company_id, status, tier_id, total_spend_amount, points_balance, lifetime_points, joined_at, expires_at")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
    : { data: null, error: null };

  const accounts = (accountsData ?? []) as MembershipAccountRow[];
  const companyIds = Array.from(new Set(accounts.map((item) => item.company_id)));
  const tierIds = Array.from(new Set(accounts.map((item) => item.tier_id).filter(Boolean))) as string[];

  const { data: companyData } = companyIds.length
    ? await supabase
        .from("companies")
        .select("id, name, slug")
        .in("id", companyIds)
    : { data: [] as CompanyRow[] };

  const companies = (companyData ?? []) as CompanyRow[];
  const companyMap = new Map(companies.map((company) => [company.id, company]));
  const { data: tierData } = tierIds.length
    ? await supabase.from("membership_tiers").select("id, name").in("id", tierIds)
    : { data: [] as MembershipTierRow[] };
  const tiers = (tierData ?? []) as MembershipTierRow[];
  const tierMap = new Map(tiers.map((tier) => [tier.id, tier]));

  const totalSpendAmount = accounts.reduce(
    (sum, account) => sum + Number(account.total_spend_amount ?? 0),
    0
  );
  const totalPoints = accounts.reduce(
    (sum, account) => sum + (account.points_balance ?? 0),
    0
  );

  // Fetch member profile for the hero banner
  const { data: profileData } = user
    ? await supabase
        .from("profiles")
        .select("full_name, avatar_url, email")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const memberProfile = profileData as { full_name: string | null; avatar_url: string | null; email: string | null } | null;
  const memberName = memberProfile?.full_name ?? user?.email ?? "Member";
  const memberInitials = memberName
    .split(" ")
    .filter(Boolean)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "CL";

  // Find the highest tier across all accounts
  const bestTier = accounts.reduce<string | null>((best, account) => {
    if (account.tier_id) {
      const tier = tierMap.get(account.tier_id);
      if (tier) return tier.name;
    }
    return best;
  }, null);

  return (
    <div className="space-y-6">
      {/* Hero banner — member detail card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-purple-700 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          {memberProfile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={memberProfile.avatar_url}
              alt={memberName}
              className="h-12 w-12 rounded-full border-2 border-white/30 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-sm font-bold">
              {memberInitials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold truncate">{memberName}</p>
            <div className="flex items-center gap-2">
              {bestTier ? (
                <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-200">
                  {bestTier}
                </span>
              ) : null}
              <span className="text-xs opacity-70">{accounts.length} {t("brand")}</span>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-yellow-300"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5.5 21h13"/></svg>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/15 p-2 text-center">
            <p className="text-xs opacity-70">{t("cards.totalBalanceTitle")}</p>
            <p className="text-sm font-bold">{totalPoints}</p>
          </div>
          <div className="rounded-lg bg-white/15 p-2 text-center">
            <p className="text-xs opacity-70">{t("cards.totalSpendTitle")}</p>
            <p className="text-sm font-bold">${totalSpendAmount.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-white/15 p-2 text-center">
            <p className="text-xs opacity-70">{t("cards.pointSystemTitle")}</p>
            <p className="text-sm font-bold">{t("cards.pointSystemName")}</p>
          </div>
        </div>
      </div>

      {accountsError ? (
        <section className="app-warning p-4 text-sm">
          {t("errors.tablesNotReady")}
        </section>
      ) : null}

      {/* Membership accounts list */}
      <section className="space-y-3">
        <span className="text-sm font-semibold text-neutral-800">{t("brand")}</span>
        {accounts.length ? (
          accounts.map((account) => {
            const company = companyMap.get(account.company_id);
            const tier = account.tier_id ? tierMap.get(account.tier_id) : null;
            return (
              <article
                key={account.id}
                className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-800">
                      {company?.name ?? t("labels.unknownCompany")}
                    </h2>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {company?.slug ? `/${company.slug}` : t("labels.membershipAccount")}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                    {account.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div>
                    <p className="text-neutral-400">{t("labels.tier")}</p>
                    <p className="font-semibold text-neutral-800">
                      {tier?.name ?? t("labels.noTier")}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">{t("labels.totalSpend")}</p>
                    <p className="font-semibold text-neutral-800">
                      ${Number(account.total_spend_amount ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">{t("labels.current")}</p>
                    <p className="font-semibold text-neutral-800">
                      {account.points_balance} {t("labels.pointUnit")}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">{t("labels.lifetime")}</p>
                    <p className="font-semibold text-neutral-800">
                      {account.lifetime_points} {t("labels.pointUnit")}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">{t("labels.joined")}</p>
                    <p className="font-semibold text-neutral-800">
                      {new Date(account.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">{t("labels.expires")}</p>
                    <p className="font-semibold text-neutral-800">
                      {account.expires_at
                        ? new Date(account.expires_at).toLocaleDateString()
                        : t("labels.noExpiry")}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <article className="rounded-xl bg-neutral-50 p-5 text-center text-sm text-neutral-500">
            {t("empty.noMemberships")}
          </article>
        )}
      </section>

      <MembershipRedemptionsPanel />
    </div>
  );
}
