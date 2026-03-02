"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

type ProfileRow = {
  id: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
  avatar_url: string | null;
  business_cards: { slug: string | null; is_default: boolean | null }[] | null;
};

type ConnectionRow = {
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
};

type ConnectionStatus = "none" | "pending" | "connected";

type ViewerPlan = "free" | "premium";

const pageSize = 20;

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return "CL";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getPrimarySlug(profile: ProfileRow) {
  const cards = profile.business_cards ?? [];
  const defaultCard = cards.find((card) => card.is_default && card.slug);
  return defaultCard?.slug ?? cards.find((card) => card.slug)?.slug ?? null;
}

export default function DiscoverPage() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("discover");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerPlan, setViewerPlan] = useState<ViewerPlan>("free");
  const [defaultCardId, setDefaultCardId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ProfileRow[]>([]);
  const [suggested, setSuggested] = useState<ProfileRow[]>([]);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadViewer = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      setMessage(t("errors.signIn"));
      setIsLoading(false);
      return null;
    }

    setViewerId(data.user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", data.user.id)
      .maybeSingle();

    setViewerPlan(profile?.plan === "premium" ? "premium" : "free");

    const { data: cards } = await supabase
      .from("business_cards")
      .select("id, is_default")
      .eq("user_id", data.user.id);
    const defaultCard = (cards ?? []).find((card) => card.is_default);
    setDefaultCardId(defaultCard?.id ?? null);

    const { data: connectionRows } = await supabase
      .from("connections")
      .select("requester_id, receiver_id, status")
      .or(
        `and(requester_id.eq.${data.user.id}),and(receiver_id.eq.${data.user.id})`
      );

    setConnections(connectionRows ?? []);

    return data.user.id;
  };

  const connectionStatusFor = (profileId: string): ConnectionStatus => {
    if (!viewerId) {
      return "none";
    }

    const connection = connections.find(
      (row) =>
        (row.requester_id === viewerId && row.receiver_id === profileId) ||
        (row.receiver_id === viewerId && row.requester_id === profileId)
    );

    if (!connection) {
      return "none";
    }

    if (connection.status === "accepted") {
      return "connected";
    }

    if (connection.status === "pending") {
      return "pending";
    }

    return "none";
  };

  const fetchResults = async (reset: boolean) => {
    setIsLoading(true);
    setMessage(null);

    const userId = viewerId ?? (await loadViewer());
    if (!userId) {
      return;
    }

    const currentPage = reset ? 0 : page;
    const from = currentPage * pageSize;
    const to = from + pageSize - 1;

    const query = supabase
      .from("profiles")
      .select(
        "id, full_name, title, company, avatar_url, business_cards(slug, is_default)"
      )
      .neq("id", userId)
      .not("business_cards.slug", "is", null)
      .or(
        `full_name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error } = await query;

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    const nextResults = (data ?? []).filter((profile) => getPrimarySlug(profile));
    setResults((prev) => (reset ? nextResults : [...prev, ...nextResults]));
    setHasMore(nextResults.length === pageSize);
    setPage(reset ? 1 : currentPage + 1);
    setIsLoading(false);
  };

  const fetchSuggested = async () => {
    if (!viewerId) {
      return;
    }

    const connectedIds = new Set(
      connections.map((row) =>
        row.requester_id === viewerId ? row.receiver_id : row.requester_id
      )
    );

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, title, company, avatar_url, business_cards(slug, is_default)"
      )
      .neq("id", viewerId)
      .not("business_cards.slug", "is", null)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      return;
    }

    const filtered = (data ?? []).filter(
      (profile) => !connectedIds.has(profile.id) && getPrimarySlug(profile)
    );

    setSuggested(filtered);
  };

  useEffect(() => {
    void loadViewer();
  }, []);

  useEffect(() => {
    if (!viewerId) {
      return;
    }
    void fetchSuggested();
  }, [viewerId, connections]);

  const handleSearch = async () => {
    setPage(0);
    await fetchResults(true);
  };

  const handleConnect = async (profileId: string) => {
    if (!viewerId) {
      return;
    }
    if (!defaultCardId) {
      setMessage(t("errors.needCard"));
      return;
    }

    const { error } = await supabase.from("connections").insert({
      requester_id: viewerId,
      receiver_id: profileId,
      status: "pending",
    });

    if (!error) {
      setConnections((prev) => [
        ...prev,
        { requester_id: viewerId, receiver_id: profileId, status: "pending" },
      ]);
    }
  };

  const renderProfileCard = (profile: ProfileRow) => {
    const slug = getPrimarySlug(profile);
    if (!slug) {
      return null;
    }

    const name = profile.full_name ?? t("defaults.user");
    const initials = getInitials(name);
    const status = connectionStatusFor(profile.id);

    const titleCompany =
      viewerPlan === "premium"
        ? [profile.title, profile.company].filter(Boolean).join(" @ ")
        : t("upgradePrompt");

    return (
      <div
        key={profile.id}
        className="app-card flex flex-col gap-3 p-4"
      >
        <Link href={`/c/${slug}`} className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">{titleCompany}</p>
          </div>
        </Link>
        <div className="flex items-center justify-between">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === "connected"
                ? "bg-emerald-50 text-emerald-600"
                : status === "pending"
                ? "bg-amber-50 text-amber-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {status === "connected"
              ? t("status.connected")
              : status === "pending"
              ? t("status.pending")
              : t("status.none")}
          </span>
          {status === "none" ? (
            <button
              onClick={() => handleConnect(profile.id)}
              className="app-primary-btn flex items-center gap-1 px-3 py-1 text-xs font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {t("actions.connect")}
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">
          {t("brand")}
        </p>
        <h1 className="app-title mt-2 text-2xl font-semibold">
          {t("title")}
        </h1>
        <p className="app-subtitle mt-2 text-sm">
          {t("subtitle")}
        </p>
      </div>

      <div className="app-card p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("search.placeholder")}
            className="app-input border-0 bg-transparent px-0 py-0 text-sm text-slate-700 shadow-none"
          />
          <button
            onClick={handleSearch}
            className="app-primary-btn px-4 py-2 text-xs font-semibold"
          >
            {t("search.action")}
          </button>
        </div>
      </div>

      {message ? (
        <p className="app-error px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <div className="app-card p-6 text-center text-sm text-slate-500">
          {t("loading")}
        </div>
      ) : results.length === 0 ? (
        <div className="app-card p-6 text-center text-sm text-slate-500">
          {t("empty.results")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map(renderProfileCard)}
        </div>
      )}

      {hasMore && results.length > 0 ? (
        <button
          onClick={() => fetchResults(false)}
          className="app-card w-full px-4 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-200 hover:text-violet-600"
        >
          {t("actions.loadMore")}
        </button>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            {t("suggested.title")}
          </h2>
        </div>
        {suggested.length === 0 ? (
          <div className="app-card p-6 text-center text-sm text-slate-500">
            {t("suggested.empty")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {suggested.map(renderProfileCard)}
          </div>
        )}
      </div>
    </div>
  );
}
