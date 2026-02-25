"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

type Company = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  profile_card_id: string | null;
  profile_card_slug: string | null;
  created_by: string | null;
};

type MemberRole = {
  company_id: string;
  user_id: string;
  role: string;
  status: string;
};

type AdminCompanyIdRow = {
  company_id: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type CardRow = {
  id: string;
  user_id: string;
  company_id: string | null;
  is_company_profile: boolean;
  card_name: string | null;
  full_name: string | null;
  title: string | null;
  company: string | null;
  slug: string | null;
  created_at: string;
  card_shares?: { count: number }[] | null;
};

type ConnectionRow = {
  requester_id: string;
  receiver_id: string;
};

type Draft = {
  mode: "new-account" | "existing-member";
  email: string;
  passwordMode: "manual" | "generated";
  password: string;
  targetUserId: string;
  cardName: string;
  fullName: string;
  title: string;
  company: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  let result = "";
  for (let index = 0; index < 14; index += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function CompanyCardsManagementPanel() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const t = useTranslations("companyCardsManagementPanel");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [adminCompanies, setAdminCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [companyMembers, setCompanyMembers] = useState<MemberRole[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    mode: "new-account",
    email: "",
    passwordMode: "generated",
    password: generatePassword(),
    targetUserId: "",
    cardName: "",
    fullName: "",
    title: "",
    company: "",
  });

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

    const [companiesRes, rolesRes, adminCompanyIdsRes] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, description, logo_url, cover_url, profile_card_id, profile_card_slug, created_by")
        .order("name", { ascending: true }),
      supabase
        .from("company_members")
        .select("company_id, user_id, role, status")
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase.rpc("get_my_admin_company_ids"),
    ]);

    if (companiesRes.error) {
      setMessage(companiesRes.error.message);
      setIsLoading(false);
      return;
    }

    const allCompanies = (companiesRes.data ?? []) as Company[];
    const selfRoles = (rolesRes.data ?? []) as MemberRole[];
    const adminCompanyRows = (adminCompanyIdsRes.data ?? []) as AdminCompanyIdRow[];

    const adminIdsByRole = selfRoles
      .filter((item) =>
        ["owner", "admin", "manager", "company_owner", "company_admin"].includes(
          (item.role ?? "").toLowerCase()
        )
      )
      .map((item) => item.company_id);
    const adminIdsByCreator = allCompanies
      .filter((item) => item.created_by === user.id)
      .map((item) => item.id);
    const adminIdsByRpc = adminCompanyRows.map((item) => item.company_id);

    const adminIds = Array.from(new Set([...adminIdsByRole, ...adminIdsByCreator, ...adminIdsByRpc]));
    const adminCompaniesRows = allCompanies.filter((item) => adminIds.includes(item.id));
    setAdminCompanies(adminCompaniesRows);

    if (!adminCompaniesRows.length) {
      setSelectedCompanyId("");
      setCompanyMembers([]);
      setProfiles([]);
      setCards([]);
      setConnections([]);
      setIsLoading(false);
      return;
    }

    const activeCompanyId = adminIds.includes(selectedCompanyId)
      ? selectedCompanyId
      : adminCompaniesRows[0].id;
    setSelectedCompanyId(activeCompanyId);

    const selectedCompany = adminCompaniesRows.find((item) => item.id === activeCompanyId);

    const { data: memberRows, error: memberError } = await supabase
      .from("company_members")
      .select("company_id, user_id, role, status")
      .eq("company_id", activeCompanyId)
      .eq("status", "active");

    if (memberError) {
      setMessage(memberError.message);
      setIsLoading(false);
      return;
    }

    const members = (memberRows ?? []) as MemberRole[];
    const memberUserIds = Array.from(new Set(members.map((row) => row.user_id))).filter(Boolean);
    setCompanyMembers(members);

    if (!memberUserIds.length) {
      setProfiles([]);
      setCards([]);
      setConnections([]);
      setIsLoading(false);
      return;
    }

    const [profilesRes, cardsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").in("id", memberUserIds),
      supabase
        .from("business_cards")
        .select("id, user_id, company_id, is_company_profile, card_name, full_name, title, company, slug, created_at, card_shares(count)")
        .in("user_id", memberUserIds)
        .order("created_at", { ascending: false }),
    ]);

    if (cardsRes.error) {
      setMessage(cardsRes.error.message);
      setIsLoading(false);
      return;
    }

    setProfiles((profilesRes.data ?? []) as Profile[]);
    setCards((cardsRes.data ?? []) as CardRow[]);

    const idList = memberUserIds.join(",");
    const { data: connectionRows, error: connectionError } = await supabase
      .from("connections")
      .select("requester_id, receiver_id")
      .eq("status", "accepted")
      .or(`requester_id.in.(${idList}),receiver_id.in.(${idList})`);

    if (connectionError) {
      setMessage(connectionError.message);
      setConnections([]);
    } else {
      setConnections((connectionRows ?? []) as ConnectionRow[]);
    }

    const firstMember = members[0]?.user_id ?? "";
    setDraft((prev) => ({
      ...prev,
      targetUserId: prev.targetUserId || firstMember,
      company: prev.company || selectedCompany?.name || "",
    }));
    setIsLoading(false);
  }, [selectedCompanyId, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  const connectionCountByUser = useMemo(() => {
    const map = new Map<string, number>();
    connections.forEach((row) => {
      map.set(row.requester_id, (map.get(row.requester_id) ?? 0) + 1);
      map.set(row.receiver_id, (map.get(row.receiver_id) ?? 0) + 1);
    });
    return map;
  }, [connections]);

  const roleMap = useMemo(() => {
    const map = new Map<string, string>();
    companyMembers.forEach((member) => {
      map.set(member.user_id, member.role);
    });
    return map;
  }, [companyMembers]);

  const selectedCompany = useMemo(
    () => adminCompanies.find((company) => company.id === selectedCompanyId) ?? null,
    [adminCompanies, selectedCompanyId]
  );

  const companyNameCards = useMemo(() => {
    const selectedCompanyName = (selectedCompany?.name ?? "").trim();

    return cards.filter((card) => {
      const isCurrentCompanyProfileCard =
        card.is_company_profile && card.company_id === selectedCompanyId;
      if (isCurrentCompanyProfileCard) {
        return false;
      }

      const belongsByCompanyId = card.company_id === selectedCompanyId;
      const belongsByLegacyCompanyText =
        card.company_id === null &&
        selectedCompanyName.length > 0 &&
        (card.company ?? "").trim().toLowerCase() === selectedCompanyName.toLowerCase();

      return belongsByCompanyId || belongsByLegacyCompanyText;
    });
  }, [cards, selectedCompanyId, selectedCompany]);

  const createCardForMember = async () => {
    if (draft.mode === "existing-member" && !draft.targetUserId) {
      setMessage(t("errors.chooseMember"));
      return;
    }

    if (draft.mode === "new-account") {
      if (!selectedCompanyId) {
        setMessage(t("errors.selectCompany"));
        return;
      }

      if (!draft.email.trim()) {
        setMessage(t("errors.emailRequired"));
        return;
      }

      if (!draft.password.trim() || draft.password.trim().length < 8) {
        setMessage(t("errors.passwordMinLength"));
        return;
      }
    }

    setBusyId("create-company-card");
    setMessage(null);

    if (draft.mode === "new-account") {
      const response = await fetch("/api/company-cards/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          email: draft.email.trim(),
          password: draft.password,
          fullName: draft.fullName,
          cardName: draft.cardName,
          title: draft.title,
          company: draft.company,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        verificationMessage?: string;
      };

      if (!response.ok) {
        setMessage(result.error ?? t("errors.createAccountCardFailed"));
        setBusyId(null);
        return;
      }

      setDraft((prev) => ({
        ...prev,
        email: "",
        password: generatePassword(),
        cardName: "",
        fullName: "",
        title: "",
      }));
      setMessage(result.verificationMessage ?? t("messages.accountCardCreated"));
      setBusyId(null);
      await loadData();
      return;
    }

    const baseName = draft.fullName.trim() || draft.cardName.trim() || t("defaults.companyCard");
    const slug = `${slugify(baseName) || "company-card"}-${Date.now().toString(36).slice(-5)}`;

    const { error } = await supabase.from("business_cards").insert({
      user_id: draft.targetUserId,
      company_id: selectedCompanyId,
      card_name: draft.cardName.trim() || t("defaults.companyCard"),
      full_name: draft.fullName.trim() || null,
      title: draft.title.trim() || null,
      company: draft.company.trim() || null,
      slug,
      is_default: false,
      background_pattern: "gradient-1",
      background_color: "#6366f1",
      template: "classic-business",
    });

    if (error) {
      setMessage(error.message);
      setBusyId(null);
      return;
    }

    setDraft((prev) => ({ ...prev, cardName: "", fullName: "", title: "", company: "" }));
    setMessage(t("messages.companyCardCreated"));
    setBusyId(null);
    await loadData();
  };

  const deleteCard = async (cardId: string) => {
    if (!window.confirm(t("confirm.deleteCard"))) {
      return;
    }

    setBusyId(`delete-${cardId}`);
    setMessage(null);

    const { error } = await supabase.from("business_cards").delete().eq("id", cardId);

    if (error) {
      setMessage(error.message);
      setBusyId(null);
      return;
    }

    setBusyId(null);
    setMessage(t("messages.cardDeleted"));
    await loadData();
  };

  const openCompanyProfileEditPage = async () => {
    if (!selectedCompanyId || !selectedCompany) {
      setMessage(t("errors.selectCompanyFirst"));
      return;
    }

    setBusyId("company-profile-edit");
    setMessage(null);

    if (selectedCompany.profile_card_id) {
      setBusyId(null);
      router.push(`/dashboard/cards/${selectedCompany.profile_card_id}/edit?mode=company`);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setBusyId(null);
      setMessage(t("errors.signInFirst"));
      return;
    }

    const { data: createdCard, error: insertError } = await supabase
      .from("business_cards")
      .insert({
        user_id: user.id,
        company_id: selectedCompanyId,
        is_company_profile: true,
        card_name: t("defaults.companyProfile"),
        full_name: null,
        title: t("defaults.companyProfile"),
        company: selectedCompany.name,
        bio: selectedCompany.description ?? null,
        slug: `company-profile-${selectedCompanyId.slice(0, 8)}-${Date.now().toString(36).slice(-5)}`,
        is_default: false,
        background_pattern: "gradient-1",
        background_color: "#6366f1",
      })
      .select("id, slug")
      .single();

    if (insertError || !createdCard) {
      setBusyId(null);
      setMessage(insertError?.message ?? t("errors.createCompanyProfileCardFailed"));
      return;
    }

    await supabase
      .from("companies")
      .update({
        profile_card_id: createdCard.id,
        profile_card_slug: createdCard.slug,
      })
      .eq("id", selectedCompanyId);

    setBusyId(null);
    await loadData();
    router.push(`/dashboard/cards/${createdCard.id}/edit?mode=company`);
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500">{t("states.loading")}</p>;
  }

  if (adminCompanies.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        {t("states.noAdmin")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
          {message}
        </div>
      ) : null}

      <section className="flex flex-wrap gap-2">
        {adminCompanies.map((company) => (
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t("sections.companyProfile.title")}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {t("sections.companyProfile.subtitle")}
        </p>
        <div className="mt-4 space-y-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
          <p>{t("labels.company")}: {selectedCompany?.name ?? "-"}</p>
          <p>{t("labels.description")}: {selectedCompany?.description ?? "-"}</p>
        </div>
        <button
          type="button"
          onClick={() => void openCompanyProfileEditPage()}
          disabled={busyId === "company-profile-edit"}
          className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busyId === "company-profile-edit"
            ? t("actions.preparing")
            : t("actions.openCompanyProfileEdit")}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t("sections.addCard.title")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                mode: "new-account",
                passwordMode: prev.passwordMode,
                password: prev.password || generatePassword(),
              }))
            }
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              draft.mode === "new-account"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t("modes.newAccount")}
          </button>
          <button
            type="button"
            onClick={() => setDraft((prev) => ({ ...prev, mode: "existing-member" }))}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              draft.mode === "existing-member"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t("modes.existingMember")}
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {draft.mode === "existing-member" ? (
            <select
              value={draft.targetUserId}
              onChange={(event) => setDraft((prev) => ({ ...prev, targetUserId: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
            >
              {companyMembers.map((member) => {
                const profile = profileMap.get(member.user_id);
                const text = profile?.full_name || profile?.email || member.user_id.slice(0, 8);
                return (
                  <option key={member.user_id} value={member.user_id}>
                    {text} ({member.role})
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              value={draft.email}
              onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              placeholder={t("placeholders.loginEmail")}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
            />
          )}
          {draft.mode === "new-account" ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-2">
              <input
                value={draft.password}
                onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={t("placeholders.password")}
                className="w-full border-0 px-1 py-1 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    passwordMode: "generated",
                    password: generatePassword(),
                  }))
                }
                className="shrink-0 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700"
              >
                {t("actions.generate")}
              </button>
            </div>
          ) : null}
          <input
            value={draft.cardName}
            onChange={(event) => setDraft((prev) => ({ ...prev, cardName: event.target.value }))}
            placeholder={t("placeholders.cardName")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
          />
          <input
            value={draft.fullName}
            onChange={(event) => setDraft((prev) => ({ ...prev, fullName: event.target.value }))}
            placeholder={t("placeholders.fullName")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
          />
          <input
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            placeholder={t("placeholders.title")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring"
          />
          <input
            value={draft.company}
            onChange={(event) => setDraft((prev) => ({ ...prev, company: event.target.value }))}
            placeholder={t("placeholders.company")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-300 focus:ring sm:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={() => void createCardForMember()}
          disabled={busyId === "create-company-card"}
          className="mt-4 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busyId === "create-company-card"
            ? t("actions.creating")
            : draft.mode === "new-account"
            ? t("actions.createAccountAndCard")
            : t("actions.addCompanyCard")}
        </button>
        {draft.mode === "new-account" ? (
          <p className="mt-2 text-xs text-slate-500">
            {t("hints.newAccount")}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">{t("sections.performance.title")}</h2>
        {companyNameCards.length ? (
          companyNameCards.map((card) => {
            const profile = profileMap.get(card.user_id);
            const viewCount = card.card_shares?.[0]?.count ?? 0;
            const connectionCount = connectionCountByUser.get(card.user_id) ?? 0;
            const role = roleMap.get(card.user_id) ?? t("labels.member");

            return (
              <article key={card.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{card.card_name || t("labels.untitledCard")}</p>
                    <p className="text-xs text-slate-500">
                      {card.full_name || profile?.full_name || profile?.email || card.user_id.slice(0, 8)} · {role}
                    </p>
                    <p className="text-xs text-slate-500">{card.title || ""}</p>
                    <p className="mt-1 text-xs text-slate-500">{t("labels.views")}: {viewCount} · {t("labels.connections")}: {connectionCount}</p>
                    {card.slug ? (
                      <Link href={`/c/${card.slug}`} className="mt-1 inline-block text-xs text-violet-600 hover:underline">
                        {t("actions.openPublicCard")}
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/cards/${card.id}/edit?mode=company`}
                      className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                    >
                      {t("actions.editPage")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void deleteCard(card.id)}
                      disabled={busyId === `delete-${card.id}`}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-60"
                    >
                      {t("actions.delete")}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            {t("empty.noCards")}
          </article>
        )}
      </section>
    </div>
  );
}
