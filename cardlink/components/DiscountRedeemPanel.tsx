"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

type Company = {
  id: string;
  name: string;
  slug: string | null;
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
};

type MembershipAccount = {
  id: string;
  company_id: string;
  user_id: string;
  points_balance: number;
  status: string;
};

type PendingRedemption = {
  id: string;
  offer_id: string;
  account_id: string;
  user_id: string | null;
  status: string;
  points_spent: number;
  redeemed_at: string;
  confirmed_at: string | null;
  reject_reason: string | null;
};

type DiscountRedeemPanelProps = {
  initialAdminView?: "pending" | "history";
};

export default function DiscountRedeemPanel({
  initialAdminView = "pending",
}: DiscountRedeemPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("discountPanel");

  const [userId, setUserId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [accounts, setAccounts] = useState<MembershipAccount[]>([]);
  const [adminCompanyIds, setAdminCompanyIds] = useState<string[]>([]);
  const [pendingRedemptions, setPendingRedemptions] = useState<PendingRedemption[]>([]);
  const [historyRedemptions, setHistoryRedemptions] = useState<PendingRedemption[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [adminView, setAdminView] = useState<"pending" | "history">(initialAdminView);

  const formatOffer = (offer: Offer) => {
    if (offer.points_cost && offer.points_cost > 0) {
      return `${offer.points_cost} ${t("admin.pointUnit")}`;
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(t("messages.signInToUse"));
      setIsLoading(false);
      return;
    }

    setUserId(user.id);

    const [companiesRes, offersRes, accountRes, adminRoleRes, selfMembershipRoleRes] =
      await Promise.all([
      supabase
        .from("companies")
        .select("id, name, slug, created_by, is_active, is_banned, deleted_at")
        .eq("is_active", true)
        .eq("is_banned", false)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("company_offers")
        .select("id, company_id, title, discount_type, discount_value, points_cost, is_active")
        .order("created_at", { ascending: false }),
      supabase
        .from("membership_accounts")
        .select("id, company_id, user_id, points_balance, status")
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase.rpc("get_my_admin_company_ids"),
      supabase
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", user.id)
        .eq("status", "active"),
      ]);

    if (companiesRes.error) {
      setMessage(t("errors.loadCompanies", { message: companiesRes.error.message }));
      setIsLoading(false);
      return;
    }

    if (offersRes.error) {
      setMessage(t("errors.loadOffers", { message: offersRes.error.message }));
      setIsLoading(false);
      return;
    }

    if (accountRes.error) {
      setMessage(t("errors.loadAccounts", { message: accountRes.error.message }));
      setIsLoading(false);
      return;
    }

    const rpcAdminIds = ((adminRoleRes.data ?? []) as { company_id: string }[]).map(
      (item) => item.company_id
    );

    const roleAdminIds = (
      (selfMembershipRoleRes.data ?? []) as { company_id: string; role: string }[]
    )
      .filter((item) => /(owner|admin|manager)/i.test(item.role ?? ""))
      .map((item) => item.company_id);

    const createdByAdminIds = ((companiesRes.data ?? []) as Company[])
      .filter((company) => company.created_by === user.id)
      .map((company) => company.id);

    const adminIds = Array.from(new Set([...rpcAdminIds, ...roleAdminIds, ...createdByAdminIds]));

    if (adminRoleRes.error || selfMembershipRoleRes.error) {
      const parts: string[] = [];
      if (adminRoleRes.error) {
        parts.push(`admin RPC unavailable: ${adminRoleRes.error.message}`);
      }
      if (selfMembershipRoleRes.error) {
        parts.push(`membership role query failed: ${selfMembershipRoleRes.error.message}`);
      }
      setMessage(t("messages.fallbackAdmin", { reason: parts.join("; ") }));
    }

    const visibleCompanies = (companiesRes.data ?? []) as Company[];
    const visibleCompanyIdSet = new Set(visibleCompanies.map((company) => company.id));

    setCompanies(visibleCompanies);
    setOffers(((offersRes.data ?? []) as Offer[]).filter((offer) => visibleCompanyIdSet.has(offer.company_id)));
    setAccounts((accountRes.data ?? []) as MembershipAccount[]);
    setAdminCompanyIds(adminIds.filter((companyId) => visibleCompanyIdSet.has(companyId)));

    if (adminIds.length > 0) {
      const { data: redemptionRes, error: redemptionError } = await supabase
        .from("offer_redemptions")
        .select("id, offer_id, account_id, user_id, status, points_spent, redeemed_at, confirmed_at, reject_reason")
        .in("status", ["pending", "confirmed", "rejected"])
        .order("redeemed_at", { ascending: false })
        .limit(200);

      if (redemptionError) {
        setMessage(t("errors.loadRedemptions", { message: redemptionError.message }));
      } else {
        const rows = (redemptionRes ?? []) as PendingRedemption[];
        setPendingRedemptions(rows.filter((item) => item.status === "pending"));
        setHistoryRedemptions(
          rows.filter((item) => item.status === "confirmed" || item.status === "rejected")
        );
      }
    } else {
      setPendingRedemptions([]);
      setHistoryRedemptions([]);
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  );

  const offerMap = useMemo(() => new Map(offers.map((offer) => [offer.id, offer])), [offers]);

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );

  const offersByCompany = useMemo(() => {
    return offers.reduce<Record<string, Offer[]>>((acc, offer) => {
      if (!acc[offer.company_id]) {
        acc[offer.company_id] = [];
      }
      acc[offer.company_id].push(offer);
      return acc;
    }, {});
  }, [offers]);

  const activeOffersByCompany = useMemo(() => {
    return Object.fromEntries(
      Object.entries(offersByCompany).map(([companyId, companyOffers]) => [
        companyId,
        companyOffers.filter((offer) => offer.is_active),
      ])
    ) as Record<string, Offer[]>;
  }, [offersByCompany]);

  const isCompanyVisible = (companyId: string) =>
    selectedCompanyId === "all" || selectedCompanyId === companyId;

  const submitRedeemRequest = async (offer: Offer, account: MembershipAccount | undefined) => {
    if (!account) {
      setMessage(t("messages.needMembership"));
      return;
    }

    setBusyId(`request-${offer.id}`);
    setMessage(null);

    const { error } = await supabase.rpc("membership_request_redeem_offer", {
      p_offer_id: offer.id,
      p_account_id: account.id,
    });

    if (error) {
      setMessage(error.message);
      setBusyId(null);
      return;
    }

    setMessage(t("messages.requestSubmitted"));
    setBusyId(null);
    await loadData();
  };

  const processPending = async (redemptionId: string, approve: boolean) => {
    setBusyId(`pending-${redemptionId}`);
    setMessage(null);

    const { error } = await supabase.rpc("company_confirm_redemption", {
      p_redemption_id: redemptionId,
      p_approve: approve,
      p_reason: approve ? null : t("messages.rejectedByAdmin"),
    });

    if (error) {
      setMessage(error.message);
      setBusyId(null);
      return;
    }

    setMessage(approve ? t("messages.confirmed") : t("messages.rejected"));
    setBusyId(null);
    await loadData();
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
          {message}
        </div>
      ) : null}

      {adminCompanyIds.length > 0 ? (
        <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("quickAccess")}
          </p>
          <Link
            href="/dashboard/discount"
            className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            {t("actions.reviewPending")}
          </Link>
          <Link
            href="/dashboard/discount/history"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t("actions.reviewHistory")}
          </Link>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedCompanyId("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            selectedCompanyId === "all"
              ? "bg-violet-600 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {t("actions.allCompanies")}
        </button>
        {companies.map((company) => (
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
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies.filter((company) => isCompanyVisible(company.id)).map((company) => {
          const companyOffers = activeOffersByCompany[company.id] ?? [];
          const userAccount = accounts.find((item) => item.company_id === company.id);

          return (
            <article
              key={company.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-base font-semibold text-slate-900">{company.name}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {company.slug ? `/${company.slug}` : t("labels.serviceCompany")}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                {t("labels.yourBalance")}: <span className="font-semibold text-violet-700">{userAccount?.points_balance ?? 0} {t("admin.pointUnit")}</span>
              </p>

              <div className="mt-4 space-y-2">
                {companyOffers.length ? (
                  companyOffers.slice(0, 4).map((offer) => (
                    <div
                      key={offer.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                    >
                      <p className="text-sm font-medium text-slate-800">{offer.title}</p>
                      <p className="text-xs text-violet-700">{formatOffer(offer)}</p>

                      <button
                        type="button"
                        onClick={() => void submitRedeemRequest(offer, userAccount)}
                        disabled={busyId === `request-${offer.id}`}
                        className="mt-2 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                      >
                        {busyId === `request-${offer.id}` ? t("actions.submitting") : t("actions.redeem")}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">{t("empty.noActiveDiscounts")}</p>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {adminCompanyIds.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">{t("admin.title")}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {t("admin.subtitle")}
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setAdminView("pending")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                adminView === "pending"
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {t("admin.pending")}
            </button>
            <button
              type="button"
              onClick={() => setAdminView("history")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                adminView === "history"
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {t("admin.history")}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {adminView === "pending" ? (
              pendingRedemptions.filter((item) => {
                const offer = offerMap.get(item.offer_id);
                return offer
                  ? adminCompanyIds.includes(offer.company_id) && isCompanyVisible(offer.company_id)
                  : false;
              }).length ? (
                pendingRedemptions
                  .filter((item) => {
                    const offer = offerMap.get(item.offer_id);
                    return offer
                      ? adminCompanyIds.includes(offer.company_id) && isCompanyVisible(offer.company_id)
                      : false;
                  })
                  .map((item) => {
                    const offer = offerMap.get(item.offer_id);
                    const company = offer ? companyMap.get(offer.company_id) : null;
                    const account = accountMap.get(item.account_id);

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {offer?.title ?? t("labels.offer")} · {company?.name ?? t("labels.company")}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {t("admin.accountPoints")}: {account?.points_balance ?? 0} · {t("admin.required")}: {item.points_spent} {t("admin.pointUnit")}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {t("admin.requested")}: {new Date(item.redeemed_at).toLocaleString()}
                        </p>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void processPending(item.id, true)}
                            disabled={busyId === `pending-${item.id}`}
                            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {t("actions.confirm")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void processPending(item.id, false)}
                            disabled={busyId === `pending-${item.id}`}
                            className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            {t("actions.reject")}
                          </button>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-sm text-slate-500">{t("empty.noPending")}</p>
              )
            ) : historyRedemptions.filter((item) => {
              const offer = offerMap.get(item.offer_id);
              return offer
                ? adminCompanyIds.includes(offer.company_id) && isCompanyVisible(offer.company_id)
                : false;
            }).length ? (
              historyRedemptions
                .filter((item) => {
                  const offer = offerMap.get(item.offer_id);
                  return offer
                    ? adminCompanyIds.includes(offer.company_id) && isCompanyVisible(offer.company_id)
                    : false;
                })
                .map((item) => {
                  const offer = offerMap.get(item.offer_id);
                  const company = offer ? companyMap.get(offer.company_id) : null;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {offer?.title ?? t("labels.offer")} · {company?.name ?? t("labels.company")}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">{t("admin.required")}: {item.points_spent} {t("admin.pointUnit")}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("admin.requested")}: {new Date(item.redeemed_at).toLocaleString()} · {t("admin.processed")}: {item.confirmed_at ? new Date(item.confirmed_at).toLocaleString() : "-"}
                      </p>
                      <p className="mt-1 text-xs font-semibold">
                        <span className={item.status === "confirmed" ? "text-emerald-700" : "text-rose-700"}>
                          {item.status === "confirmed" ? t("status.confirmed") : t("status.rejected")}
                        </span>
                        {item.reject_reason ? ` · ${item.reject_reason}` : ""}
                      </p>
                    </div>
                  );
                })
            ) : (
              <p className="text-sm text-slate-500">{t("empty.noHistory")}</p>
            )}
          </div>
        </section>
      ) : null}

      {!userId ? (
        <p className="text-sm text-slate-500">{t("messages.signInToUse")}</p>
      ) : null}
    </div>
  );
}
