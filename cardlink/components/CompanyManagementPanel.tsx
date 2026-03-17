"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

type Company = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  created_by: string | null;
  is_active: boolean;
  is_banned: boolean;
  deleted_at: string | null;
};

type CompanyMemberRole = {
  company_id: string;
  role: string;
  status: string;
};

type MembershipAccount = {
  id: string;
  company_id: string;
  user_id: string;
  status: string;
  tier_id: string | null;
  total_spend_amount: number;
  points_balance: number;
  lifetime_points: number;
  joined_at: string;
};

type MembershipProgram = {
  id: string;
  company_id: string;
  name: string;
};

type MembershipTier = {
  id: string;
  program_id: string;
  name: string;
  rank: number;
  required_spend_amount: number;
  is_active: boolean;
};

type MembershipSpendTransaction = {
  id: string;
  company_id: string;
  account_id: string;
  user_id: string;
  amount: number;
  currency: string;
  note: string | null;
  occurred_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type CompanyOffer = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  discount_type: string | null;
  discount_value: number | null;
  points_cost: number | null;
  is_active: boolean;
  usage_limit: number | null;
  per_member_limit: number | null;
};

type OfferRedemption = {
  id: string;
  offer_id: string;
  status: string;
  points_spent: number;
  redeemed_at: string;
  user_id: string | null;
  reject_reason: string | null;
};

type CompanyEditor = {
  name: string;
  description: string;
  logo_url: string;
  cover_url: string;
};

type OfferDraft = {
  title: string;
  description: string;
  discountType: "percentage" | "fixed" | "special";
  discountValue: string;
  pointsCost: string;
  usageLimit: string;
  perMemberLimit: string;
};

type OfferEditDraft = {
  title: string;
  description: string;
  discountType: "percentage" | "fixed" | "special";
  discountValue: string;
  pointsCost: string;
  usageLimit: string;
  perMemberLimit: string;
  isActive: boolean;
};

const emptyOfferDraft: OfferDraft = {
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  pointsCost: "",
  usageLimit: "",
  perMemberLimit: "",
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function CompanyManagementPanel() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("companyManagementPanel");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [adminCompanyIds, setAdminCompanyIds] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [editor, setEditor] = useState<CompanyEditor>({
    name: "",
    description: "",
    logo_url: "",
    cover_url: "",
  });
  const [memberships, setMemberships] = useState<MembershipAccount[]>([]);
  const [membershipPrograms, setMembershipPrograms] = useState<MembershipProgram[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([]);
  const [tierRequirementDraft, setTierRequirementDraft] = useState<Record<string, string>>({});
  const [membershipTransactions, setMembershipTransactions] = useState<MembershipSpendTransaction[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [offers, setOffers] = useState<CompanyOffer[]>([]);
  const [pendingRedemptions, setPendingRedemptions] = useState<OfferRedemption[]>([]);
  const [offerDraft, setOfferDraft] = useState<OfferDraft>(emptyOfferDraft);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerEditDraft, setOfferEditDraft] = useState<OfferEditDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(t("errors.signIn"));
      setIsLoading(false);
      return;
    }

    const [companiesRes, ownerRoleRes] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, slug, description, logo_url, cover_url, created_by, is_active, is_banned, deleted_at")
        .eq("is_active", true)
        .eq("is_banned", false)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("company_members")
        .select("company_id, role, status")
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);

    if (companiesRes.error) {
      setMessage(companiesRes.error.message);
      setIsLoading(false);
      return;
    }

    const companyRows = (companiesRes.data ?? []) as Company[];
    const roleRows = (ownerRoleRes.data ?? []) as CompanyMemberRole[];

    const ownerIdsByRole = roleRows
      .filter((item) => ["owner", "admin", "manager"].includes((item.role ?? "").toLowerCase()))
      .map((item) => item.company_id);
    const ownerIdsByCreator = companyRows
      .filter((item) => item.created_by === user.id)
      .map((item) => item.id);

    const resolvedAdminCompanyIds = Array.from(new Set([...ownerIdsByRole, ...ownerIdsByCreator]));
    setAdminCompanyIds(resolvedAdminCompanyIds);
    setCompanies(companyRows.filter((company) => resolvedAdminCompanyIds.includes(company.id)));

    if (resolvedAdminCompanyIds.length === 0) {
      setSelectedCompanyId("");
      setMemberships([]);
      setMembershipPrograms([]);
      setMembershipTiers([]);
      setTierRequirementDraft({});
      setMembershipTransactions([]);
      setProfiles([]);
      setOffers([]);
      setPendingRedemptions([]);
      setIsLoading(false);
      return;
    }

    const activeCompanyId =
      resolvedAdminCompanyIds.includes(selectedCompanyId) ? selectedCompanyId : resolvedAdminCompanyIds[0];

    setSelectedCompanyId(activeCompanyId);

    const [membershipsRes, offersRes, redemptionsRes, programsRes, transactionsRes] = await Promise.all([
      supabase
        .from("membership_accounts")
        .select("id, company_id, user_id, status, tier_id, total_spend_amount, points_balance, lifetime_points, joined_at")
        .eq("company_id", activeCompanyId)
        .order("joined_at", { ascending: false }),
      supabase
        .from("company_offers")
        .select("id, company_id, title, description, discount_type, discount_value, points_cost, is_active, usage_limit, per_member_limit")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("offer_redemptions")
        .select("id, offer_id, status, points_spent, redeemed_at, user_id, reject_reason")
        .in("status", ["pending", "confirmed", "rejected"])
        .order("redeemed_at", { ascending: false })
        .limit(200),
      supabase
        .from("membership_programs")
        .select("id, company_id, name")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: true }),
      supabase
        .from("membership_spend_transactions")
        .select("id, company_id, account_id, user_id, amount, currency, note, occurred_at")
        .eq("company_id", activeCompanyId)
        .order("occurred_at", { ascending: false })
        .limit(500),
    ]);

    if (membershipsRes.error) {
      setMessage(membershipsRes.error.message);
      setIsLoading(false);
      return;
    }

    if (offersRes.error) {
      setMessage(offersRes.error.message);
      setIsLoading(false);
      return;
    }

    const offerRows = (offersRes.data ?? []) as CompanyOffer[];
    const programRows = (programsRes.data ?? []) as MembershipProgram[];

    setMemberships((membershipsRes.data ?? []) as MembershipAccount[]);
    setOffers(offerRows);
    setMembershipPrograms(programRows);

    if (programsRes.error) {
      setMessage(programsRes.error.message);
    }

    if (transactionsRes.error) {
      setMembershipTransactions([]);
      setMessage((prev) => prev ?? transactionsRes.error?.message ?? null);
    } else {
      setMembershipTransactions((transactionsRes.data ?? []) as MembershipSpendTransaction[]);
    }

    const programIds = programRows.map((item) => item.id);
    if (programIds.length > 0) {
      const { data: tierRows, error: tiersError } = await supabase
        .from("membership_tiers")
        .select("id, program_id, name, rank, required_spend_amount, is_active")
        .in("program_id", programIds)
        .order("rank", { ascending: true });

      if (tiersError) {
        setMembershipTiers([]);
        setTierRequirementDraft({});
        setMessage((prev) => prev ?? tiersError.message);
      } else {
        const resolvedTiers = (tierRows ?? []) as MembershipTier[];
        setMembershipTiers(resolvedTiers);
        setTierRequirementDraft(
          resolvedTiers.reduce<Record<string, string>>((acc, tier) => {
            acc[tier.id] = String(Number(tier.required_spend_amount ?? 0));
            return acc;
          }, {})
        );
      }
    } else {
      setMembershipTiers([]);
      setTierRequirementDraft({});
    }

    if (redemptionsRes.error) {
      setMessage(redemptionsRes.error.message);
      setPendingRedemptions([]);
    } else {
      const offerIdSet = new Set(offerRows.map((item) => item.id));
      const filtered = ((redemptionsRes.data ?? []) as OfferRedemption[]).filter((item) =>
        offerIdSet.has(item.offer_id)
      );
      setPendingRedemptions(filtered.filter((item) => item.status === "pending"));
    }

    const membershipRows = (membershipsRes.data ?? []) as MembershipAccount[];
    const memberIds = Array.from(new Set(membershipRows.map((row) => row.user_id))).filter(Boolean);

    if (memberIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", memberIds);
      setProfiles((profileRows ?? []) as Profile[]);
    } else {
      setProfiles([]);
    }

    const selectedCompany = companyRows.find((item) => item.id === activeCompanyId);
    setEditor({
      name: selectedCompany?.name ?? "",
      description: selectedCompany?.description ?? "",
      logo_url: selectedCompany?.logo_url ?? "",
      cover_url: selectedCompany?.cover_url ?? "",
    });

    setIsLoading(false);
  }, [selectedCompanyId, supabase, t]);

  useEffect(() => {
    // Initial data bootstrap for this panel is intentionally triggered from mount/dependency changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const selectedCompany = companies.find((item) => item.id === selectedCompanyId) ?? null;
  const profileMap = useMemo(() => new Map(profiles.map((item) => [item.id, item])), [profiles]);
  const offerMap = useMemo(() => new Map(offers.map((item) => [item.id, item])), [offers]);
  const tierMap = useMemo(() => new Map(membershipTiers.map((item) => [item.id, item])), [membershipTiers]);

  const saveCompany = async () => {
    if (!selectedCompanyId) {
      return;
    }

    setBusyId("save-company");
    setMessage(null);

    const response = await fetch("/api/company-management/profile", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-cardlink-app-scope": "business",
      },
      body: JSON.stringify({
        company_id: selectedCompanyId,
        name: editor.name,
        description: editor.description,
        logo_url: editor.logo_url,
        cover_url: editor.cover_url,
      }),
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Failed to save company profile.");
      setBusyId(null);
      return;
    }

    setMessage(t("messages.companyProfileUpdated"));
    setBusyId(null);
    await loadData();
  };

  const createOffer = async () => {
    if (!selectedCompanyId) {
      return;
    }

    if (!offerDraft.title.trim()) {
      setMessage(t("errors.discountTitleRequired"));
      return;
    }

    setBusyId("create-offer");
    setMessage(null);

    const discountValue = offerDraft.discountValue.trim() === "" ? null : Number(offerDraft.discountValue);
    const pointsCost = offerDraft.pointsCost.trim() === "" ? null : Number(offerDraft.pointsCost);
    const usageLimit = offerDraft.usageLimit.trim() === "" ? null : Number(offerDraft.usageLimit);
    const perMemberLimit =
      offerDraft.perMemberLimit.trim() === "" ? null : Number(offerDraft.perMemberLimit);

    if (
      (usageLimit !== null && (!Number.isFinite(usageLimit) || usageLimit < 0)) ||
      (perMemberLimit !== null && (!Number.isFinite(perMemberLimit) || perMemberLimit < 0))
    ) {
      setMessage(t("errors.usageLimitInvalid"));
      setBusyId(null);
      return;
    }

    const response = await fetch("/api/company-management/offers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cardlink-app-scope": "business",
      },
      body: JSON.stringify({
        company_id: selectedCompanyId,
        title: offerDraft.title,
        description: offerDraft.description,
        discount_type: offerDraft.discountType === "special" ? null : offerDraft.discountType,
        discount_value: Number.isFinite(discountValue) ? discountValue : null,
        points_cost: Number.isFinite(pointsCost) ? pointsCost : null,
        usage_limit: Number.isFinite(usageLimit) ? usageLimit : null,
        per_member_limit: Number.isFinite(perMemberLimit) ? perMemberLimit : null,
      }),
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Failed to create discount.");
      setBusyId(null);
      return;
    }

    setOfferDraft(emptyOfferDraft);
    setMessage(t("messages.discountUploaded"));
    setBusyId(null);
    await loadData();
  };

  const deleteOffer = async (offerId: string) => {
    if (!selectedCompanyId) {
      return;
    }

    const confirmed = window.confirm(t("confirm.deleteDiscount"));
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-offer-${offerId}`);
    setMessage(null);

    const response = await fetch(`/api/company-management/offers/${offerId}`, {
      method: "DELETE",
      headers: {
        "x-cardlink-app-scope": "business",
      },
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Failed to delete discount.");
      setBusyId(null);
      return;
    }

    setMessage(t("messages.discountDeleted"));
    setBusyId(null);
    await loadData();
  };

  const startEditOffer = (offer: CompanyOffer) => {
    const nextType: OfferEditDraft["discountType"] =
      offer.discount_type === "percentage" || offer.discount_type === "fixed"
        ? offer.discount_type
        : "special";

    setEditingOfferId(offer.id);
    setOfferEditDraft({
      title: offer.title,
      description: offer.description ?? "",
      discountType: nextType,
      discountValue: offer.discount_value === null ? "" : String(offer.discount_value),
      pointsCost: offer.points_cost === null ? "" : String(offer.points_cost),
      usageLimit: offer.usage_limit === null ? "" : String(offer.usage_limit),
      perMemberLimit: offer.per_member_limit === null ? "" : String(offer.per_member_limit),
      isActive: offer.is_active,
    });
  };

  const cancelEditOffer = () => {
    setEditingOfferId(null);
    setOfferEditDraft(null);
  };

  const saveEditedOffer = async () => {
    if (!editingOfferId || !offerEditDraft || !selectedCompanyId) {
      return;
    }

    if (!offerEditDraft.title.trim()) {
      setMessage(t("errors.discountTitleRequired"));
      return;
    }

    const discountValue =
      offerEditDraft.discountValue.trim() === "" ? null : Number(offerEditDraft.discountValue);
    const pointsCost =
      offerEditDraft.pointsCost.trim() === "" ? null : Number(offerEditDraft.pointsCost);
    const usageLimit =
      offerEditDraft.usageLimit.trim() === "" ? null : Number(offerEditDraft.usageLimit);
    const perMemberLimit =
      offerEditDraft.perMemberLimit.trim() === "" ? null : Number(offerEditDraft.perMemberLimit);

    if (
      (usageLimit !== null && (!Number.isFinite(usageLimit) || usageLimit < 0)) ||
      (perMemberLimit !== null && (!Number.isFinite(perMemberLimit) || perMemberLimit < 0))
    ) {
      setMessage(t("errors.usageLimitInvalid"));
      return;
    }

    setBusyId(`save-offer-${editingOfferId}`);
    setMessage(null);

    const response = await fetch(`/api/company-management/offers/${editingOfferId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-cardlink-app-scope": "business",
      },
      body: JSON.stringify({
        company_id: selectedCompanyId,
        title: offerEditDraft.title,
        description: offerEditDraft.description,
        discount_type:
          offerEditDraft.discountType === "special" ? null : offerEditDraft.discountType,
        discount_value: Number.isFinite(discountValue) ? discountValue : null,
        points_cost: Number.isFinite(pointsCost) ? pointsCost : null,
        usage_limit: Number.isFinite(usageLimit) ? usageLimit : null,
        per_member_limit: Number.isFinite(perMemberLimit) ? perMemberLimit : null,
        is_active: offerEditDraft.isActive,
      }),
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Failed to update discount.");
      setBusyId(null);
      return;
    }

    setMessage(t("messages.discountUpdated"));
    setBusyId(null);
    cancelEditOffer();
    await loadData();
  };

  const handlePending = async (redemptionId: string, approve: boolean) => {
    setBusyId(`pending-${redemptionId}`);
    setMessage(null);

    const response = await fetch(
      `/api/company-management/redemptions/${redemptionId}/decision`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-cardlink-app-scope": "business",
        },
        body: JSON.stringify({
          approve,
          reason: approve ? null : t("messages.rejectedByOwner"),
        }),
      }
    );

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Failed to process redemption.");
      setBusyId(null);
      return;
    }

    setMessage(approve ? t("messages.couponRedeemed") : t("messages.couponRejected"));
    setBusyId(null);
    await loadData();
  };

  const saveTierRequiredAmount = async (tierId: string) => {
    const raw = tierRequirementDraft[tierId] ?? "0";
    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0) {
      setMessage(t("errors.requiredAmountInvalid"));
      return;
    }

    setBusyId(`tier-${tierId}`);
    setMessage(null);

    const response = await fetch(`/api/company-management/membership-tiers/${tierId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-cardlink-app-scope": "business",
      },
      body: JSON.stringify({
        required_spend_amount: value,
      }),
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Failed to update tier requirement.");
      setBusyId(null);
      return;
    }

    setMessage(t("messages.tierRequirementUpdated"));
    setBusyId(null);
    await loadData();
  };

  if (isLoading) {
    return <p className="text-sm text-gray-500">{t("states.loading")}</p>;
  }

  if (adminCompanyIds.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
        {t("states.noAdmin")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">{t("header.brand")}</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{t("header.title")}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {t("header.subtitle")}
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          {message}
        </div>
      ) : null}

      <section className="flex flex-wrap gap-2">
        {companies.map((company) => (
          <button
            key={company.id}
            type="button"
            onClick={() => setSelectedCompanyId(company.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              selectedCompanyId === company.id
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 ring-1 ring-slate-200 hover:bg-gray-50"
            }`}
          >
            {company.name}
          </button>
        ))}
      </section>

      {selectedCompany ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">{t("sections.companyProfile.title")}</h2>
            <p className="mt-1 text-xs text-gray-500">{t("sections.companyProfile.subtitle")}</p>

            <div className="mt-4 space-y-3">
              <input
                value={editor.name}
                onChange={(event) => setEditor((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={t("placeholders.companyName")}
                className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring"
              />
              <textarea
                value={editor.description}
                onChange={(event) => setEditor((prev) => ({ ...prev, description: event.target.value }))}
                placeholder={t("placeholders.companyDescription")}
                rows={3}
                className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring"
              />
              <input
                value={editor.logo_url}
                onChange={(event) => setEditor((prev) => ({ ...prev, logo_url: event.target.value }))}
                placeholder={t("placeholders.companyLogoUrl")}
                className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring"
              />
              <input
                value={editor.cover_url}
                onChange={(event) => setEditor((prev) => ({ ...prev, cover_url: event.target.value }))}
                placeholder={t("placeholders.companyCoverUrl")}
                className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring"
              />
            </div>

            <button
              type="button"
              onClick={() => void saveCompany()}
              disabled={busyId === "save-company"}
              className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {busyId === "save-company"
                ? t("actions.saving")
                : t("actions.saveCompanyProfile")}
            </button>
          </article>

          <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">{t("sections.currentDiscounts.title")}</h2>
            <div className="mt-3 space-y-2">
              {offers.length ? (
                offers.slice(0, 8).map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    {editingOfferId === offer.id && offerEditDraft ? (
                      <div className="space-y-2">
                        <input
                          value={offerEditDraft.title}
                          onChange={(event) =>
                            setOfferEditDraft((prev) =>
                              prev ? { ...prev, title: event.target.value } : prev
                            )
                          }
                          placeholder={t("placeholders.discountTitle")}
                          className="w-full rounded-lg border border-gray-100 px-2 py-1.5 text-xs outline-none ring-indigo-300 focus:ring"
                        />
                        <textarea
                          value={offerEditDraft.description}
                          onChange={(event) =>
                            setOfferEditDraft((prev) =>
                              prev ? { ...prev, description: event.target.value } : prev
                            )
                          }
                          placeholder={t("placeholders.discountDescription")}
                          rows={2}
                          className="w-full rounded-lg border border-gray-100 px-2 py-1.5 text-xs outline-none ring-indigo-300 focus:ring"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            value={offerEditDraft.discountType}
                            onChange={(event) =>
                              setOfferEditDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      discountType: event.target.value as OfferEditDraft["discountType"],
                                    }
                                  : prev
                              )
                            }
                            className="w-full rounded-lg border border-gray-100 px-2 py-1.5 text-xs outline-none ring-indigo-300 focus:ring"
                          >
                            <option value="percentage">{t("discountType.percentage")}</option>
                            <option value="fixed">{t("discountType.fixed")}</option>
                            <option value="special">{t("discountType.special")}</option>
                          </select>
                          <input
                            value={offerEditDraft.discountValue}
                            onChange={(event) =>
                              setOfferEditDraft((prev) =>
                                prev ? { ...prev, discountValue: event.target.value } : prev
                              )
                            }
                            placeholder={t("placeholders.discountValue")}
                            className="w-full rounded-lg border border-gray-100 px-2 py-1.5 text-xs outline-none ring-indigo-300 focus:ring"
                          />
                          <input
                            value={offerEditDraft.pointsCost}
                            onChange={(event) =>
                              setOfferEditDraft((prev) =>
                                prev ? { ...prev, pointsCost: event.target.value } : prev
                              )
                            }
                            placeholder={t("placeholders.pointsCostOptional")}
                            className="w-full rounded-lg border border-gray-100 px-2 py-1.5 text-xs outline-none ring-indigo-300 focus:ring"
                          />
                          <input
                            value={offerEditDraft.usageLimit}
                            onChange={(event) =>
                              setOfferEditDraft((prev) =>
                                prev ? { ...prev, usageLimit: event.target.value } : prev
                              )
                            }
                            placeholder={t("placeholders.usageLimitOptional")}
                            className="w-full rounded-lg border border-gray-100 px-2 py-1.5 text-xs outline-none ring-indigo-300 focus:ring"
                          />
                          <input
                            value={offerEditDraft.perMemberLimit}
                            onChange={(event) =>
                              setOfferEditDraft((prev) =>
                                prev ? { ...prev, perMemberLimit: event.target.value } : prev
                              )
                            }
                            placeholder={t("placeholders.perMemberLimitOptional")}
                            className="w-full rounded-lg border border-gray-100 px-2 py-1.5 text-xs outline-none ring-indigo-300 focus:ring"
                          />
                          <label className="flex items-center gap-2 rounded-lg border border-gray-100 px-2 py-1.5 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={offerEditDraft.isActive}
                              onChange={(event) =>
                                setOfferEditDraft((prev) =>
                                  prev ? { ...prev, isActive: event.target.checked } : prev
                                )
                              }
                            />
                            {t("labels.active")}
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void saveEditedOffer()}
                            disabled={busyId === `save-offer-${offer.id}`}
                            className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {busyId === `save-offer-${offer.id}` ? t("actions.saving") : t("actions.saveDiscount")}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditOffer}
                            className="rounded-full border border-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                          >
                            {t("actions.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-900">{offer.title}</p>
                        <p className="text-xs text-gray-600">
                          {offer.discount_type === "percentage" && offer.discount_value !== null
                            ? t("offer.percentageOff", { value: offer.discount_value })
                            : offer.discount_type === "fixed" && offer.discount_value !== null
                            ? t("offer.fixedOff", { value: offer.discount_value })
                            : offer.points_cost
                            ? t("offer.points", { value: offer.points_cost })
                            : t("offer.special")}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {offer.is_active ? t("common.active") : t("common.inactive")}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {t("labels.totalLimit")}: {offer.usage_limit ?? t("common.unlimited")} · {t("labels.perUserLimit")}: {offer.per_member_limit ?? t("common.unlimited")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditOffer(offer)}
                            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                          >
                            {t("actions.editDiscount")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteOffer(offer.id)}
                            disabled={busyId === `delete-offer-${offer.id}`}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-60"
                          >
                            {busyId === `delete-offer-${offer.id}` ? t("actions.deleting") : t("actions.deleteDiscount")}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">{t("empty.noDiscount")}</p>
              )}
            </div>
          </article>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t("sections.uploadDiscount.title")}</h2>
          <div className="mt-4 space-y-3">
            <input
              value={offerDraft.title}
              onChange={(event) => setOfferDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder={t("placeholders.discountTitle")}
              className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring"
            />
            <textarea
              value={offerDraft.description}
              onChange={(event) => setOfferDraft((prev) => ({ ...prev, description: event.target.value }))}
              placeholder={t("placeholders.discountDescription")}
              rows={3}
              className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring"
            />
            <select
              value={offerDraft.discountType}
              onChange={(event) =>
                setOfferDraft((prev) => ({
                  ...prev,
                  discountType: event.target.value as OfferDraft["discountType"],
                }))
              }
              className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring"
            >
              <option value="percentage">{t("discountType.percentage")}</option>
              <option value="fixed">{t("discountType.fixed")}</option>
              <option value="special">{t("discountType.special")}</option>
            </select>
            <input
              value={offerDraft.discountValue}
              onChange={(event) =>
                setOfferDraft((prev) => ({ ...prev, discountValue: event.target.value }))
              }
              placeholder={t("placeholders.discountValue")}
              className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring"
            />
            <input
              value={offerDraft.pointsCost}
              onChange={(event) => setOfferDraft((prev) => ({ ...prev, pointsCost: event.target.value }))}
              placeholder={t("placeholders.pointsCostOptional")}
              className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring"
            />
            <input
              value={offerDraft.usageLimit}
              onChange={(event) => setOfferDraft((prev) => ({ ...prev, usageLimit: event.target.value }))}
              placeholder={t("placeholders.usageLimitOptional")}
              className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring"
            />
            <input
              value={offerDraft.perMemberLimit}
              onChange={(event) =>
                setOfferDraft((prev) => ({ ...prev, perMemberLimit: event.target.value }))
              }
              placeholder={t("placeholders.perMemberLimitOptional")}
              className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-indigo-300 focus:ring"
            />
          </div>
          <button
            type="button"
            onClick={() => void createOffer()}
            disabled={busyId === "create-offer"}
            className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busyId === "create-offer"
              ? t("actions.submitting")
              : t("actions.uploadDiscount")}
          </button>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t("sections.members.title")}</h2>
          <div className="mt-3 space-y-2">
            {memberships.length ? (
              memberships.slice(0, 30).map((account) => {
                const profile = profileMap.get(account.user_id);
                const tier = account.tier_id ? tierMap.get(account.tier_id) : null;
                return (
                  <div key={account.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {profile?.full_name || profile?.email || account.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("labels.status")}: {account.status} · {t("labels.tier")}: {tier?.name ?? t("common.na")} · {t("labels.spend")}: ${Number(account.total_spend_amount ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("labels.current")}: {account.points_balance} · {t("labels.lifetime")}: {account.lifetime_points}
                    </p>
                    <p className="text-[11px] text-gray-400">{t("labels.joined")} {formatDate(account.joined_at)}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">{t("empty.noMembershipAccount")}</p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t("sections.tierRules.title")}</h2>
          <p className="mt-1 text-xs text-gray-500">
            {t("sections.tierRules.subtitle")}
          </p>

          <div className="mt-3 space-y-2">
            {membershipTiers.length ? (
              membershipTiers
                .filter((tier) => tier.is_active)
                .map((tier) => {
                  const programName =
                    membershipPrograms.find((program) => program.id === tier.program_id)?.name ?? t("common.program");
                  return (
                    <div key={tier.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {tier.name} <span className="text-xs text-gray-500">({t("labels.rank")} {tier.rank})</span>
                          </p>
                          <p className="text-[11px] text-gray-500">{programName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={tierRequirementDraft[tier.id] ?? "0"}
                            onChange={(event) =>
                              setTierRequirementDraft((prev) => ({ ...prev, [tier.id]: event.target.value }))
                            }
                            inputMode="decimal"
                            className="w-28 rounded-lg border border-gray-100 px-2 py-1 text-sm outline-none ring-indigo-300 focus:ring"
                          />
                          <button
                            type="button"
                            onClick={() => void saveTierRequiredAmount(tier.id)}
                            disabled={busyId === `tier-${tier.id}`}
                            className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {busyId === `tier-${tier.id}` ? t("actions.saving") : t("actions.save")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-sm text-gray-500">{t("empty.noMembershipTiers")}</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">{t("sections.transactions.title")}</h2>
          <p className="mt-1 text-xs text-gray-500">{t("sections.transactions.subtitle")}</p>

          <div className="mt-3 space-y-2">
            {membershipTransactions.length ? (
              membershipTransactions.slice(0, 80).map((txn) => {
                const account = memberships.find((item) => item.id === txn.account_id);
                const profile = account ? profileMap.get(account.user_id) : null;

                return (
                  <div key={txn.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {profile?.full_name || profile?.email || txn.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("labels.amount")}: {txn.currency} {Number(txn.amount ?? 0).toFixed(2)} · {t("labels.account")}: {txn.account_id.slice(0, 8)}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {formatDate(txn.occurred_at)}{txn.note ? ` · ${txn.note}` : ""}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">{t("empty.noMembershipTransactions")}</p>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t("sections.redemption.title")}</h2>
            <p className="mt-1 text-sm text-gray-500">{t("sections.redemption.subtitle")}</p>
          </div>
          <Link
            href="/dashboard/scan"
            className="rounded-full border border-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {t("actions.scanRedemption")}
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          {pendingRedemptions.length ? (
            pendingRedemptions.map((item) => {
              const offer = offerMap.get(item.offer_id);
              return (
                <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{offer?.title ?? t("common.offer")}</p>
                      <p className="text-xs text-gray-500">
                        {t("labels.user")}: {item.user_id ? item.user_id.slice(0, 8) : t("common.unknown")} · {t("labels.points")}: {item.points_spent} · {formatDate(item.redeemed_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handlePending(item.id, true)}
                        disabled={busyId === `pending-${item.id}`}
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {t("actions.approve")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePending(item.id, false)}
                        disabled={busyId === `pending-${item.id}`}
                        className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {t("actions.reject")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500">{t("empty.noPendingRedemption")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
