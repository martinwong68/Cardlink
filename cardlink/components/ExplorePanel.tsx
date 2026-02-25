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
};

type Offer = {
  id: string;
  company_id: string;
  title: string;
  discount_type: string | null;
  discount_value: number | null;
  points_cost: number | null;
  is_active: boolean;
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
        .select("id, name, slug, profile_card_slug, description, logo_url, cover_url, created_by, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("company_offers")
        .select("id, company_id, title, discount_type, discount_value, points_cost, is_active")
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
    setOffers((offersRes.data ?? []) as Offer[]);
    setAccounts((accountsRes.data ?? []) as MembershipAccount[]);
    const programCompanyIds = Array.from(new Set(activePrograms.map((item) => item.company_id)));
    setPartnerCompanyIds(programCompanyIds.length ? programCompanyIds : companyRows.map((company) => company.id));
    setOwnerCompanyIds(Array.from(new Set([...createdByOwnerIds, ...roleOwnerIds, ...rpcAdminIds])));

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
      .map((offer) => {
        const company = companyMap.get(offer.company_id);
        if (!company) {
          return null;
        }
        return { offer, company };
      })
      .filter((item): item is { offer: Offer; company: Company } => Boolean(item));
  }, [offers, companyMap]);

  const visibleOffers =
    selectedCompanyId === "all"
      ? offers
      : offers.filter((offer) => offer.company_id === selectedCompanyId);

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
    return <p className="text-sm text-slate-500">{t("loading")}</p>;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
            {t("brand")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t("title")}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("subtitle")}
          </p>
        </div>
        {ownerCompanyIds.length > 0 ? (
          <Link
            href="/dashboard/company-management"
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Company management
          </Link>
        ) : null}
      </div>

      {message ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
          {message}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-3 xl:items-start">
        <section className="flex min-h-0 flex-col space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">{t("sections.promotion")}</h2>
          </div>
          <div className="min-h-[18rem] space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-20rem)]">
            {promoSlides.length ? (
              promoSlides.map(({ offer, company }) => (
                <Link
                  key={offer.id}
                  href={`/dashboard/explore?companyId=${company.id}`}
                  className="block overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div
                    className="h-36 w-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${company.cover_url || "/promo-template.svg"})`,
                    }}
                  />
                  <div className="space-y-1 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                      {company.name}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{offer.title}</p>
                    <p className="text-xs text-slate-500">{formatOffer(offer)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <article className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                {t("empty.promotions")}
              </article>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">{t("sections.partners")}</h2>
          <div className="min-h-[18rem] space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-20rem)]">
            {partnerCompanies.length ? (
              partnerCompanies.map((company) => {
                const hasMembership = accounts.some(
                  (account) => account.company_id === company.id
                );

                return (
                  <article
                    key={company.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-16 w-16 shrink-0 rounded-xl bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${company.logo_url || "/promo-template.svg"})`,
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {company.name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {company.description || t("labels.membershipPartner")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Link
                        href={companyProfileSlugMap[company.id] ? `/c/${companyProfileSlugMap[company.id]}` : `/dashboard/explore?companyId=${company.id}`}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        {t("actions.view")}
                      </Link>
                      {hasMembership ? (
                        <Link
                          href="/dashboard/membership"
                          className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700"
                        >
                          {t("actions.joined")}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void joinMembership(company.id)}
                          disabled={busyJoinCompanyId === company.id}
                          className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                        >
                          {busyJoinCompanyId === company.id ? t("actions.submitting") : t("actions.join")}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <article className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                {t("empty.partners")}
              </article>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-slate-900">{t("sections.discounts")}</h2>
            <div className="overflow-x-auto pb-1">
              <div className="flex w-max gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCompanyId("all")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    selectedCompanyId === "all"
                      ? "bg-violet-600 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t("actions.all")}
                </button>
                {partnerCompanies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => setSelectedCompanyId(company.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      selectedCompanyId === company.id
                        ? "bg-violet-600 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {company.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="min-h-[18rem] space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-23rem)]">
            {visibleOffers.length ? (
              visibleOffers.map((offer) => {
                const company = companyMap.get(offer.company_id);
                const account = accounts.find((item) => item.company_id === offer.company_id);

                return (
                  <article
                    key={offer.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                      {company?.name ?? t("labels.company")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{offer.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatOffer(offer)}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {t("labels.balance")}: <span className="font-semibold text-violet-700">{account?.points_balance ?? 0} {t("labels.pointUnit")}</span>
                    </p>

                    <button
                      type="button"
                      onClick={() => void redeemOffer(offer)}
                      disabled={busyOfferId === offer.id}
                      className="mt-3 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                    >
                      {busyOfferId === offer.id ? t("actions.submitting") : t("actions.redeem")}
                    </button>
                  </article>
                );
              })
            ) : (
              <article className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                {t("empty.discounts")}
              </article>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
