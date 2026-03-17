"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

type Company = {
  id: string;
  name: string;
  slug: string | null;
  profile_card_slug: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  created_by: string | null;
  is_active: boolean;
  is_banned: boolean;
  deleted_at: string | null;
};

type Offer = {
  id: string;
  company_id: string;
  title: string;
  discount_type: string | null;
  discount_value: number | null;
  points_cost: number | null;
  is_active: boolean;
  usage_limit: number | null;
  per_member_limit: number | null;
};

type MembershipAccount = {
  id: string;
  company_id: string;
  user_id: string;
  points_balance: number;
  status: string;
};

type MembershipProgram = {
  company_id: string;
  is_active: boolean;
};

type CompanyOwnerRole = {
  company_id: string;
  role: string;
  status: string;
};

type AdminCompanyIdRow = {
  company_id: string;
};

type ProfileCardByCompany = {
  company_id: string | null;
  slug: string | null;
};

type LegacyProfileCard = {
  slug: string | null;
};

type OfferRedemptionUsage = {
  offer_id: string;
  user_id: string | null;
  status: string;
};

export default function ExplorePanel() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const t = useTranslations("explorePage");

  const [userId, setUserId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [accounts, setAccounts] = useState<MembershipAccount[]>([]);
  const [partnerCompanyIds, setPartnerCompanyIds] = useState<string[]>([]);
  const [ownerCompanyIds, setOwnerCompanyIds] = useState<string[]>([]);
  const [companyProfileSlugMap, setCompanyProfileSlugMap] = useState<Record<string, string>>({});
  const [offerTotalUsageMap, setOfferTotalUsageMap] = useState<Record<string, number>>({});
  const [offerUserUsageMap, setOfferUserUsageMap] = useState<Record<string, number>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [busyJoinCompanyId, setBusyJoinCompanyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const formatOffer = (offer: Offer) => {
    if (offer.points_cost && offer.points_cost > 0) {
      return `${offer.points_cost} ${t("labels.pointUnit")}`;
    }

    if (offer.discount_type === "percentage" && offer.discount_value !== null) {
      return t("labels.offPercent", { value: offer.discount_value });
    }

    if (offer.discount_type === "fixed" && offer.discount_value !== null) {
      return t("labels.offFixed", { value: offer.discount_value });
    }

    if (offer.discount_value !== null) {
      return t("labels.offGeneric", { value: offer.discount_value });
    }

    return t("labels.specialOffer");
  };

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserId(user?.id ?? null);

    const [companiesRes, offersRes, programsRes, accountsRes, ownerRolesRes, adminCompanyIdsRes] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, slug, profile_card_slug, description, logo_url, cover_url, created_by, is_active, is_banned, deleted_at")
        .eq("is_active", true)
        .eq("is_banned", false)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("company_offers")
        .select("id, company_id, title, discount_type, discount_value, points_cost, is_active, usage_limit, per_member_limit")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("membership_programs")
        .select("company_id, is_active")
        .eq("is_active", true),
      user
        ? supabase
            .from("membership_accounts")
            .select("id, company_id, user_id, points_balance, status")
            .eq("user_id", user.id)
            .eq("status", "active")
        : Promise.resolve({ data: [] as MembershipAccount[], error: null }),
      user
        ? supabase
            .from("company_members")
            .select("company_id, role, status")
            .eq("user_id", user.id)
            .eq("status", "active")
        : Promise.resolve({ data: [] as CompanyOwnerRole[], error: null }),
      user
        ? supabase.rpc("get_my_admin_company_ids")
        : Promise.resolve({ data: [] as AdminCompanyIdRow[], error: null }),
    ]);

    if (companiesRes.error) {
      setMessage(t("errors.loadCompanies", { message: companiesRes.error.message }));
      setIsLoading(false);
      return;
    }

    if (offersRes.error) {
      setMessage(t("errors.loadDiscounts", { message: offersRes.error.message }));
      setIsLoading(false);
      return;
    }

    if (accountsRes.error) {
      setMessage(t("errors.loadMemberships", { message: accountsRes.error.message }));
      setIsLoading(false);
      return;
    }

    const companyRows = (companiesRes.data ?? []) as Company[];
    const visibleCompanyIdSet = new Set(companyRows.map((company) => company.id));
    const offerRows = ((offersRes.data ?? []) as Offer[]).filter((offer) =>
      visibleCompanyIdSet.has(offer.company_id)
    );
    const activePrograms = (programsRes.data ?? []) as MembershipProgram[];
    const ownerRoleRows = (ownerRolesRes.data ?? []) as CompanyOwnerRole[];
    const adminCompanyRows = (adminCompanyIdsRes.data ?? []) as AdminCompanyIdRow[];
    const createdByOwnerIds = companyRows
      .filter((company) => company.created_by === user?.id)
      .map((company) => company.id);
    const roleOwnerIds = ownerRoleRows
      .filter((row) =>
        ["owner", "admin", "manager", "company_owner", "company_admin"].includes(
          (row.role ?? "").toLowerCase()
        )
      )
      .map((row) => row.company_id);
    const rpcAdminIds = adminCompanyRows.map((row) => row.company_id);

    setCompanies(companyRows);
    setOffers(offerRows);
    setAccounts((accountsRes.data ?? []) as MembershipAccount[]);
    const programCompanyIds = Array.from(new Set(activePrograms.map((item) => item.company_id)));
    setPartnerCompanyIds(programCompanyIds.length ? programCompanyIds : companyRows.map((company) => company.id));
    setOwnerCompanyIds(Array.from(new Set([...createdByOwnerIds, ...roleOwnerIds, ...rpcAdminIds])));

    const offerIds = offerRows.map((offer) => offer.id);
    if (offerIds.length > 0) {
      const { data: usageRows } = await supabase
        .from("offer_redemptions")
        .select("offer_id, user_id, status")
        .in("offer_id", offerIds)
        .neq("status", "rejected")
        .limit(5000);

      const totalCounts: Record<string, number> = {};
      const userCounts: Record<string, number> = {};

      ((usageRows ?? []) as OfferRedemptionUsage[]).forEach((row) => {
        totalCounts[row.offer_id] = (totalCounts[row.offer_id] ?? 0) + 1;
        if (user && row.user_id === user.id) {
          userCounts[row.offer_id] = (userCounts[row.offer_id] ?? 0) + 1;
        }
      });

      setOfferTotalUsageMap(totalCounts);
      setOfferUserUsageMap(userCounts);
    } else {
      setOfferTotalUsageMap({});
      setOfferUserUsageMap({});
    }

    const slugMap: Record<string, string> = {};
    companyRows.forEach((company) => {
      if (company.profile_card_slug) {
        slugMap[company.id] = company.profile_card_slug;
      }
    });

    if (companyRows.length) {
      const companyIds = companyRows.map((company) => company.id);

      const { data: companyLinkedCards } = await supabase
        .from("business_cards")
        .select("company_id, slug")
        .in("company_id", companyIds)
        .eq("is_company_profile", true)
        .order("created_at", { ascending: false })
        .limit(500);

      ((companyLinkedCards ?? []) as ProfileCardByCompany[]).forEach((row) => {
        if (!row.company_id || !row.slug) {
          return;
        }
        if (!slugMap[row.company_id]) {
          slugMap[row.company_id] = row.slug;
        }
      });

      const missingCompanyIds = companyIds.filter((companyId) => !slugMap[companyId]);
      if (missingCompanyIds.length) {
        const prefixMap = new Map<string, string>();
        const legacyFilters: string[] = [];

        missingCompanyIds.forEach((companyId) => {
          const prefix = `company-profile-${companyId.slice(0, 8)}-`;
          prefixMap.set(prefix, companyId);
          legacyFilters.push(`slug.like.${prefix}%`);
        });

        if (legacyFilters.length) {
          const { data: legacyCards } = await supabase
            .from("business_cards")
            .select("slug")
            .or(legacyFilters.join(","))
            .order("created_at", { ascending: false })
            .limit(500);

          ((legacyCards ?? []) as LegacyProfileCard[]).forEach((row) => {
            const slug = row.slug ?? "";
            if (!slug) {
              return;
            }

            const matchedPrefix = Array.from(prefixMap.keys()).find((prefix) =>
              slug.startsWith(prefix)
            );
            if (!matchedPrefix) {
              return;
            }

            const companyId = prefixMap.get(matchedPrefix);
            if (companyId && !slugMap[companyId]) {
              slugMap[companyId] = slug;
            }
          });
        }
      }
    }

    setCompanyProfileSlugMap(slugMap);

    setIsLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const queryCompanyId = searchParams.get("companyId");
    if (!queryCompanyId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSelectedCompanyId(queryCompanyId);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchParams]);

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  );

  const partnerCompanies = useMemo(
    () => companies.filter((company) => partnerCompanyIds.includes(company.id)),
    [companies, partnerCompanyIds]
  );

  const promoSlides = useMemo(() => {
    return offers
      .filter((offer) => {
        const totalUsage = offerTotalUsageMap[offer.id] ?? 0;
        const userUsage = offerUserUsageMap[offer.id] ?? 0;
        const overTotalLimit =
          offer.usage_limit !== null && offer.usage_limit >= 0 && totalUsage >= offer.usage_limit;
        const overUserLimit =
          userId !== null &&
          offer.per_member_limit !== null &&
          offer.per_member_limit >= 0 &&
          userUsage >= offer.per_member_limit;
        return !overTotalLimit && !overUserLimit;
      })
      .map((offer) => {
        const company = companyMap.get(offer.company_id);
        if (!company) {
          return null;
        }
        return { offer, company };
      })
      .filter((item): item is { offer: Offer; company: Company } => Boolean(item));
  }, [offers, companyMap, offerTotalUsageMap, offerUserUsageMap, userId]);

  const availableOffers = useMemo(() => {
    return offers.filter((offer) => {
      const totalUsage = offerTotalUsageMap[offer.id] ?? 0;
      const userUsage = offerUserUsageMap[offer.id] ?? 0;
      const overTotalLimit =
        offer.usage_limit !== null && offer.usage_limit >= 0 && totalUsage >= offer.usage_limit;
      const overUserLimit =
        userId !== null &&
        offer.per_member_limit !== null &&
        offer.per_member_limit >= 0 &&
        userUsage >= offer.per_member_limit;
      return !overTotalLimit && !overUserLimit;
    });
  }, [offers, offerTotalUsageMap, offerUserUsageMap, userId]);

  const visibleOffers =
    selectedCompanyId === "all"
      ? availableOffers
      : availableOffers.filter((offer) => offer.company_id === selectedCompanyId);

  const redeemOffer = async (offer: Offer) => {
    if (!userId) {
      setMessage(t("messages.signInToRedeem"));
      return;
    }

    const account = accounts.find((item) => item.company_id === offer.company_id);
    if (!account) {
      setMessage(t("messages.applyMembershipFirst"));
      return;
    }

    setBusyOfferId(offer.id);
    setMessage(null);

    const { error } = await supabase.rpc("membership_request_redeem_offer", {
      p_offer_id: offer.id,
      p_account_id: account.id,
    });

    if (error) {
      setMessage(error.message);
      setBusyOfferId(null);
      return;
    }

    setMessage(t("messages.redeemSubmitted"));
    setBusyOfferId(null);
    await loadData();
  };

  const joinMembership = async (companyId: string) => {
    if (!userId) {
      setMessage(t("messages.signInToRedeem"));
      return;
    }

    setBusyJoinCompanyId(companyId);
    setMessage(null);

    const { error } = await supabase.rpc("membership_join_company", {
      p_company_id: companyId,
    });

    if (error) {
      setMessage(error.message);
      setBusyJoinCompanyId(null);
      return;
    }

    setMessage(t("actions.joined"));
    setBusyJoinCompanyId(null);
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* Message / alert */}
      {message ? (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span className="text-xs font-medium text-indigo-800">{message}</span>
        </div>
      ) : null}

      {/* Featured Offers — horizontal scroll cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">{t("sections.promotion")}</span>
          <span className="text-xs font-medium text-indigo-600">View All</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {promoSlides.length ? (
            promoSlides.map(({ offer, company }) => (
              <Link
                key={offer.id}
                href={`/dashboard/explore?companyId=${company.id}`}
                className="flex-shrink-0 w-40 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 p-4 text-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-lg font-bold leading-tight">{formatOffer(offer)}</div>
                <div className="mt-1 text-xs opacity-80 truncate">{company.name}</div>
                <div className="mt-1 text-xs opacity-70 truncate">{offer.title}</div>
                <div className="mt-3 rounded-lg bg-white/20 px-2 py-1 text-center text-xs font-medium">
                  Claim Now
                </div>
              </Link>
            ))
          ) : (
            <div className="w-full rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              {t("empty.promotions")}
            </div>
          )}
        </div>
      </section>

      {/* Categories grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">Categories</span>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex w-max gap-2">
            <button
              type="button"
              onClick={() => setSelectedCompanyId("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCompanyId === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t("actions.all")}
            </button>
            {partnerCompanies.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => setSelectedCompanyId(company.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedCompanyId === company.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {company.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Partners — card list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">{t("sections.partners")}</span>
        </div>
        <div className="space-y-2">
          {partnerCompanies.length ? (
            partnerCompanies.map((company) => {
              const hasMembership = accounts.some(
                (account) => account.company_id === company.id
              );

              return (
                <article
                  key={company.id}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
                >
                  <div
                    className="h-10 w-10 shrink-0 rounded-lg bg-indigo-100 bg-cover bg-center flex items-center justify-center"
                    style={company.logo_url ? { backgroundImage: `url(${company.logo_url})` } : {}}
                  >
                    {!company.logo_url && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{company.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {company.description || t("labels.membershipPartner")}
                    </p>
                  </div>
                  {hasMembership ? (
                    <Link
                      href="/dashboard/membership"
                      className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"
                    >
                      {t("actions.joined")}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void joinMembership(company.id)}
                      disabled={busyJoinCompanyId === company.id}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                    >
                      {busyJoinCompanyId === company.id ? t("actions.submitting") : t("actions.join")}
                    </button>
                  )}
                  <Link
                    href={companyProfileSlugMap[company.id] ? `/c/${companyProfileSlugMap[company.id]}` : `/dashboard/explore?companyId=${company.id}`}
                    aria-label={t("actions.view")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                </article>
              );
            })
          ) : (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              {t("empty.partners")}
            </div>
          )}
        </div>
      </section>

      {/* Discounts — offer cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">{t("sections.discounts")}</span>
        </div>
        <div className="space-y-3">
          {visibleOffers.length ? (
            visibleOffers.map((offer) => {
              const company = companyMap.get(offer.company_id);
              const account = accounts.find((item) => item.company_id === offer.company_id);

              return (
                <article
                  key={offer.id}
                  className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">
                        {company?.name ?? t("labels.company")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{offer.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatOffer(offer)}</p>
                    </div>
                    <div className="ml-3 flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {t("labels.balance")}: <span className="font-semibold text-indigo-700">{account?.points_balance ?? 0} {t("labels.pointUnit")}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => void redeemOffer(offer)}
                      disabled={busyOfferId === offer.id}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                    >
                      {busyOfferId === offer.id ? t("actions.submitting") : t("actions.redeem")}
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              {t("empty.discounts")}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
