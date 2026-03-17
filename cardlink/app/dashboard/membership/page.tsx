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

  return (
    <div className="space-y-6">
      {/* Gradient hero banner matching Reference */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-5 text-white shadow-lg">
        <div className="mb-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
          <span className="text-sm font-bold">{t("title")}</span>
        </div>
        <div className="mb-4 text-xs opacity-70">{t("subtitle")}</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/15 p-2 text-center">
            <div className="text-xs opacity-70">{t("cards.totalBalanceTitle")}</div>
            <div className="text-sm font-bold">{totalPoints}</div>
          </div>
          <div className="rounded-lg bg-white/15 p-2 text-center">
            <div className="text-xs opacity-70">{t("cards.pointSystemTitle")}</div>
            <div className="text-sm font-bold">{t("cards.pointSystemName")}</div>
          </div>
          <div className="rounded-lg bg-white/15 p-2 text-center">
            <div className="text-xs opacity-70">{t("cards.totalSpendTitle")}</div>
            <div className="text-sm font-bold">${totalSpendAmount.toFixed(0)}</div>
          </div>
        </div>
      </div>

      {accountsError ? (
        <section className="app-card p-5 text-sm text-amber-700">
          {t("errors.tablesNotReady")}
        </section>
      ) : null}

      <section className="space-y-3">
        {accounts.length ? (
          accounts.map((account) => {
            const company = companyMap.get(account.company_id);
            const tier = account.tier_id ? tierMap.get(account.tier_id) : null;
            return (
              <article
                key={account.id}
                className="app-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {company?.name ?? t("labels.unknownCompany")}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      {company?.slug ? `/${company.slug}` : t("labels.membershipAccount")}
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {account.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500">{t("labels.tier")}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {tier?.name ?? t("labels.noTier")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("labels.totalSpend")}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ${Number(account.total_spend_amount ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("labels.current")}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {account.points_balance} {t("labels.pointUnit")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("labels.lifetime")}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {account.lifetime_points} {t("labels.pointUnit")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("labels.joined")}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(account.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("labels.expires")}</p>
                    <p className="text-sm font-semibold text-gray-900">
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
          <article className="app-card p-5 text-sm text-gray-600">
            {t("empty.noMemberships")}
          </article>
        )}
      </section>

      <MembershipRedemptionsPanel />
    </div>
  );
}
