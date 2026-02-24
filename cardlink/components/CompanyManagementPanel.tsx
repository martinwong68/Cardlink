"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/src/lib/supabase/client";

type Company = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  created_by: string | null;
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
};

const emptyOfferDraft: OfferDraft = {
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  pointsCost: "",
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
  const [userId, setUserId] = useState<string | null>(null);
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
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Please sign in to use company management.");
      setIsLoading(false);
      return;
    }

    setUserId(user.id);

    const [companiesRes, ownerRoleRes] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, slug, description, logo_url, cover_url, created_by")
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
        .select("id, company_id, title, description, discount_type, discount_value, points_cost, is_active")
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
  }, [selectedCompanyId, supabase]);

  useEffect(() => {
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

    const { error } = await supabase
      .from("companies")
      .update({
        name: editor.name.trim(),
        description: editor.description.trim() || null,
        logo_url: editor.logo_url.trim() || null,
        cover_url: editor.cover_url.trim() || null,
      })
      .eq("id", selectedCompanyId);

    if (error) {
      setMessage(error.message);
      setBusyId(null);
      return;
    }

    setMessage("Company profile updated.");
    setBusyId(null);
    await loadData();
  };

  const createOffer = async () => {
    if (!selectedCompanyId) {
      return;
    }

    if (!offerDraft.title.trim()) {
      setMessage("Discount title is required.");
      return;
    }

    setBusyId("create-offer");
    setMessage(null);

    const discountValue = offerDraft.discountValue.trim() === "" ? null : Number(offerDraft.discountValue);
    const pointsCost = offerDraft.pointsCost.trim() === "" ? null : Number(offerDraft.pointsCost);

    const { error } = await supabase.from("company_offers").insert({
      company_id: selectedCompanyId,
      title: offerDraft.title.trim(),
      description: offerDraft.description.trim() || null,
      offer_type: "discount",
      discount_type: offerDraft.discountType === "special" ? null : offerDraft.discountType,
      discount_value: Number.isFinite(discountValue) ? discountValue : null,
      points_cost: Number.isFinite(pointsCost) ? pointsCost : null,
      is_active: true,
      created_by: userId,
    });

    if (error) {
      setMessage(error.message);
      setBusyId(null);
      return;
    }

    setOfferDraft(emptyOfferDraft);
    setMessage("Discount uploaded.");
    setBusyId(null);
    await loadData();
  };

  const handlePending = async (redemptionId: string, approve: boolean) => {
    setBusyId(`pending-${redemptionId}`);
    setMessage(null);

    const { error } = await supabase.rpc("company_confirm_redemption", {
      p_redemption_id: redemptionId,
      p_approve: approve,
      p_reason: approve ? null : "Rejected by company owner",
    });

    if (error) {
      setMessage(error.message);
      setBusyId(null);
      return;
    }

    setMessage(approve ? "Coupon redeemed." : "Coupon rejected.");
    setBusyId(null);
    await loadData();
  };

  const saveTierRequiredAmount = async (tierId: string) => {
    const raw = tierRequirementDraft[tierId] ?? "0";
    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0) {
      setMessage("Required amount must be a valid non-negative number.");
      return;
    }

    setBusyId(`tier-${tierId}`);
    setMessage(null);

    const { error } = await supabase
      .from("membership_tiers")
      .update({ required_spend_amount: value })
      .eq("id", tierId);

    if (error) {
      setMessage(error.message);
      setBusyId(null);
      return;
    }

    setMessage("Tier upgrade required amount updated.");
    setBusyId(null);
    await loadData();
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading company management...</p>;
  }

  if (adminCompanyIds.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        You are not a company owner/admin yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">CardLink</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Company Management</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage company profile, discounts, members, and coupon redemption approvals.
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
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
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {company.name}
          </button>
        ))}
      </section>

      {selectedCompany ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Company Profile</h2>
            <p className="mt-1 text-xs text-slate-500">Update company image and promotion banner URLs.</p>

            <div className="mt-4 space-y-3">
              <input
                value={editor.name}
                onChange={(event) => setEditor((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Company name"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
              />
              <textarea
                value={editor.description}
                onChange={(event) => setEditor((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Company description"
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
              />
              <input
                value={editor.logo_url}
                onChange={(event) => setEditor((prev) => ({ ...prev, logo_url: event.target.value }))}
                placeholder="Company image URL (logo_url)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
              />
              <input
                value={editor.cover_url}
                onChange={(event) => setEditor((prev) => ({ ...prev, cover_url: event.target.value }))}
                placeholder="Promotion banner URL (cover_url)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
              />
            </div>

            <button
              type="button"
              onClick={() => void saveCompany()}
              disabled={busyId === "save-company"}
              className="mt-4 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {busyId === "save-company" ? "Saving..." : "Save company profile"}
            </button>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Current Discounts</h2>
            <div className="mt-3 space-y-2">
              {offers.length ? (
                offers.slice(0, 8).map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{offer.title}</p>
                    <p className="text-xs text-slate-600">
                      {offer.discount_type === "percentage" && offer.discount_value !== null
                        ? `${offer.discount_value}% off`
                        : offer.discount_type === "fixed" && offer.discount_value !== null
                        ? `$${offer.discount_value} off`
                        : offer.points_cost
                        ? `${offer.points_cost} BOBO-POINT`
                        : "Special offer"}
                    </p>
                    <p className="text-[11px] text-slate-500">{offer.is_active ? "Active" : "Inactive"}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No discount yet.</p>
              )}
            </div>
          </article>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Upload New Discount</h2>
          <div className="mt-4 space-y-3">
            <input
              value={offerDraft.title}
              onChange={(event) => setOfferDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Discount title"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
            />
            <textarea
              value={offerDraft.description}
              onChange={(event) => setOfferDraft((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Discount description"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
            />
            <select
              value={offerDraft.discountType}
              onChange={(event) =>
                setOfferDraft((prev) => ({
                  ...prev,
                  discountType: event.target.value as OfferDraft["discountType"],
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
              <option value="special">Special</option>
            </select>
            <input
              value={offerDraft.discountValue}
              onChange={(event) =>
                setOfferDraft((prev) => ({ ...prev, discountValue: event.target.value }))
              }
              placeholder="Discount value"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
            />
            <input
              value={offerDraft.pointsCost}
              onChange={(event) => setOfferDraft((prev) => ({ ...prev, pointsCost: event.target.value }))}
              placeholder="Points cost (optional)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
            />
          </div>
          <button
            type="button"
            onClick={() => void createOffer()}
            disabled={busyId === "create-offer"}
            className="mt-4 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busyId === "create-offer" ? "Submitting..." : "Upload discount"}
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Membership Members</h2>
          <div className="mt-3 space-y-2">
            {memberships.length ? (
              memberships.slice(0, 30).map((account) => {
                const profile = profileMap.get(account.user_id);
                const tier = account.tier_id ? tierMap.get(account.tier_id) : null;
                return (
                  <div key={account.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {profile?.full_name || profile?.email || account.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Status: {account.status} · Tier: {tier?.name ?? "N/A"} · Spend: ${Number(account.total_spend_amount ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Current: {account.points_balance} · Lifetime: {account.lifetime_points}
                    </p>
                    <p className="text-[11px] text-slate-400">Joined {formatDate(account.joined_at)}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No membership account yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Membership Tier Upgrade Rules</h2>
          <p className="mt-1 text-xs text-slate-500">
            Set required spend amount for each tier upgrade.
          </p>

          <div className="mt-3 space-y-2">
            {membershipTiers.length ? (
              membershipTiers
                .filter((tier) => tier.is_active)
                .map((tier) => {
                  const programName =
                    membershipPrograms.find((program) => program.id === tier.program_id)?.name ?? "Program";
                  return (
                    <div key={tier.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {tier.name} <span className="text-xs text-slate-500">(Rank {tier.rank})</span>
                          </p>
                          <p className="text-[11px] text-slate-500">{programName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={tierRequirementDraft[tier.id] ?? "0"}
                            onChange={(event) =>
                              setTierRequirementDraft((prev) => ({ ...prev, [tier.id]: event.target.value }))
                            }
                            inputMode="decimal"
                            className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none ring-violet-300 focus:ring"
                          />
                          <button
                            type="button"
                            onClick={() => void saveTierRequiredAmount(tier.id)}
                            disabled={busyId === `tier-${tier.id}`}
                            className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {busyId === `tier-${tier.id}` ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-sm text-slate-500">No membership tiers found.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Membership Account Transactions</h2>
          <p className="mt-1 text-xs text-slate-500">Owner/admin can review each account spending transaction.</p>

          <div className="mt-3 space-y-2">
            {membershipTransactions.length ? (
              membershipTransactions.slice(0, 80).map((txn) => {
                const account = memberships.find((item) => item.id === txn.account_id);
                const profile = account ? profileMap.get(account.user_id) : null;

                return (
                  <div key={txn.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {profile?.full_name || profile?.email || txn.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Amount: {txn.currency} {Number(txn.amount ?? 0).toFixed(2)} · Account: {txn.account_id.slice(0, 8)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(txn.occurred_at)}{txn.note ? ` · ${txn.note}` : ""}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No membership transaction record yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Coupon / Discount Redemption</h2>
            <p className="mt-1 text-sm text-slate-500">Approve or reject pending redemption requests.</p>
          </div>
          <Link
            href="/dashboard/scan"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Scan redemption
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          {pendingRedemptions.length ? (
            pendingRedemptions.map((item) => {
              const offer = offerMap.get(item.offer_id);
              return (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{offer?.title ?? "Offer"}</p>
                      <p className="text-xs text-slate-500">
                        User: {item.user_id ? item.user_id.slice(0, 8) : "Unknown"} · Points: {item.points_spent} · {formatDate(item.redeemed_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handlePending(item.id, true)}
                        disabled={busyId === `pending-${item.id}`}
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePending(item.id, false)}
                        disabled={busyId === `pending-${item.id}`}
                        className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No pending redemption request.</p>
          )}
        </div>
      </section>
    </div>
  );
}
