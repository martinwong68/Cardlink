"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";
import RelativeTime from "@/components/RelativeTime";

type BoardRow = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  icon: string | null;
  sort_order: number | null;
  company_id: string | null;
  logo_url: string | null;
  member_count: number | null;
  is_public: boolean | null;
};

type CompanyInfo = {
  id: string;
  name: string | null;
  logo_url: string | null;
};

type PostRow = {
  id: string;
  title: string;
  body: string;
  reply_count: number | null;
  last_activity_at: string | null;
  created_at: string;
  author_id: string;
  sub_board_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

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

export default function CommunityPage() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("communityDashboardList");
  const [boards, setBoards] = useState<(BoardRow & { company?: CompanyInfo | null })[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "company" | "public">("all");

  const loadBoards = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    const [{ data: boardData, error: boardError }, { data: postData }] =
      await Promise.all([
        supabase
          .from("boards")
          .select("id, name, slug, description, icon, sort_order, company_id, logo_url, member_count, is_public")
          .order("sort_order", { ascending: true }),
        supabase
          .from("forum_posts")
          .select("id, sub_board_id")
          .eq("is_banned", false)
          .order("created_at", { ascending: false }),
      ]);

    if (boardError) {
      setMessage(boardError.message);
      setIsLoading(false);
      return;
    }

    // Get company info for company-scoped boards
    const companyIds = Array.from(
      new Set((boardData ?? []).map((b) => b.company_id).filter(Boolean))
    ) as string[];

    const { data: companyData } = companyIds.length
      ? await supabase
          .from("companies")
          .select("id, name, logo_url")
          .in("id", companyIds)
      : { data: [] as CompanyInfo[] };

    const companyMap = new Map(
      (companyData ?? []).map((c) => [c.id, c])
    );

    // Count posts per board
    const subBoardIds = Array.from(
      new Set((postData ?? []).map((post) => post.sub_board_id).filter(Boolean))
    );

    const { data: subBoardData } = subBoardIds.length
      ? await supabase
          .from("sub_boards")
          .select("id, board_id")
          .in("id", subBoardIds)
      : { data: [] as { id: string; board_id: string | null }[] };

    const subBoardMap = new Map(
      (subBoardData ?? []).map((sub) => [sub.id, sub.board_id])
    );

    const counts: Record<string, number> = {};
    (postData ?? []).forEach((post) => {
      const boardId = subBoardMap.get(post.sub_board_id) ?? null;
      if (!boardId) return;
      counts[boardId] = (counts[boardId] ?? 0) + 1;
    });

    const enrichedBoards = (boardData ?? []).map((board) => ({
      ...board,
      company: board.company_id ? companyMap.get(board.company_id) ?? null : null,
    }));

    setBoards(enrichedBoards);
    setPostCounts(counts);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    const handleFocus = () => void loadBoards();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadBoards();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadBoards]);

  const filteredBoards = useMemo(() => {
    if (filter === "company") return boards.filter((b) => b.company_id);
    if (filter === "public") return boards.filter((b) => !b.company_id);
    return boards;
  }, [boards, filter]);

  const colors = ["#6366F1", "#14B8A6", "#F59E0B", "#3B82F6", "#EF4444", "#10B981", "#8B5CF6", "#EC4899"];

  return (
    <div className="space-y-6">
      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "all" as const, label: t("filters.all") },
          { key: "company" as const, label: t("filters.company") },
          { key: "public" as const, label: t("filters.public") },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === key
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="app-error px-3 py-2 text-sm">{message}</p>
      ) : null}

      {/* Community Cards Grid */}
      {isLoading ? (
        <div className="rounded-xl bg-gray-50 p-6 text-sm text-gray-500">
          {t("states.loading")}
        </div>
      ) : filteredBoards.length === 0 ? (
        <div className="app-card p-6 text-center text-sm text-gray-500">
          {t("empty.noCommunities")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredBoards.map((board, idx) => {
            const count = postCounts[board.id] ?? 0;
            const color = colors[(board.sort_order ?? idx) % colors.length];
            const companyName = board.company?.name;

            return (
              <Link
                key={board.id}
                href={`/dashboard/community/${board.slug}`}
                className="app-card block p-0 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200"
              >
                {/* Card header with color band */}
                <div
                  className="h-2"
                  style={{ backgroundColor: color }}
                />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Community avatar */}
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {board.logo_url ? (
                        <img
                          src={board.logo_url}
                          alt={board.name ?? ""}
                          className="h-12 w-12 rounded-xl object-cover"
                        />
                      ) : (
                        board.icon || getInitials(board.name ?? "Community")
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {board.name}
                      </h3>
                      {companyName && (
                        <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
                          {companyName}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {board.description ?? ""}
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400">
                      {t("labels.posts", { count })}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {t("labels.members", { count: board.member_count ?? 0 })}
                    </span>
                    {board.is_public === false && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium ml-auto">
                        {t("labels.private")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
