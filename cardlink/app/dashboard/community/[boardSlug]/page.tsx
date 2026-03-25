"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

type BoardRow = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  icon: string | null;
  company_id: string | null;
  logo_url: string | null;
  member_count: number | null;
};

type SubBoardRow = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  sort_order: number | null;
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

export default function BoardPage() {
  const params = useParams();
  const boardSlug = Array.isArray(params.boardSlug)
    ? params.boardSlug[0]
    : params.boardSlug;
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("communityDashboardBoard");
  const [board, setBoard] = useState<BoardRow | null>(null);
  const [subBoards, setSubBoards] = useState<SubBoardRow[]>([]);
  const [postCountsBySubBoard, setPostCountsBySubBoard] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadBoard = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: boardData, error: boardError } = await supabase
      .from("boards")
      .select("id, name, slug, description, icon, company_id, logo_url, member_count")
      .eq("slug", boardSlug)
      .maybeSingle();

    if (boardError || !boardData) {
      setMessage(t("errors.boardNotFound"));
      setIsLoading(false);
      return;
    }

    const { data: subBoardData } = await supabase
      .from("sub_boards")
      .select("id, name, slug, description, sort_order")
      .eq("board_id", boardData.id)
      .order("sort_order", { ascending: true });

    // Get post counts per sub-board
    const subBoardIds = (subBoardData ?? []).map((sub) => sub.id);
    const counts: Record<string, number> = {};

    if (subBoardIds.length) {
      const { data: postData } = await supabase
        .from("forum_posts")
        .select("id, sub_board_id")
        .in("sub_board_id", subBoardIds)
        .eq("is_banned", false);

      (postData ?? []).forEach((post) => {
        counts[post.sub_board_id] = (counts[post.sub_board_id] ?? 0) + 1;
      });
    }

    setBoard(boardData);
    setSubBoards(subBoardData ?? []);
    setPostCountsBySubBoard(counts);
    setIsLoading(false);
  };

  useEffect(() => {
    if (boardSlug) {
      void loadBoard();
    }
  }, [boardSlug]);

  if (isLoading) {
    return (
      <div className="app-card p-6 text-center text-sm text-gray-500">
        {t("states.loading")}
      </div>
    );
  }

  if (!board) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600 shadow-sm">
        {message ?? t("errors.boardNotFound")}
      </div>
    );
  }

  const colors = ["#6366F1", "#14B8A6", "#F59E0B", "#3B82F6", "#EF4444", "#10B981", "#8B5CF6", "#EC4899"];

  return (
    <div className="space-y-6">
      {/* Community header card */}
      <div className="app-card overflow-hidden">
        <div className="h-2 bg-indigo-600" />
        <div className="p-5">
          <Link
            href="/dashboard/community"
            className="app-kicker"
          >
            {t("labels.community")}
          </Link>
          <div className="flex items-start gap-4 mt-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white shrink-0">
              {board.logo_url ? (
                <img
                  src={board.logo_url}
                  alt={board.name ?? ""}
                  className="h-14 w-14 rounded-xl object-cover"
                />
              ) : (
                board.icon || getInitials(board.name ?? "Community")
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {board.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{board.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>{t("labels.categories", { count: subBoards.length })}</span>
                <span>{t("labels.members", { count: board.member_count ?? 0 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-board cards grid — community card view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {subBoards.map((subBoard, idx) => {
          const count = postCountsBySubBoard[subBoard.id] ?? 0;
          const color = colors[(subBoard.sort_order ?? idx) % colors.length];

          return (
            <Link
              key={subBoard.id}
              href={`/dashboard/community/${board.slug}/${subBoard.slug}`}
              className="app-card block p-0 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200"
            >
              <div
                className="h-1.5"
                style={{ backgroundColor: color }}
              />
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {getInitials(subBoard.name ?? "C")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {subBoard.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {subBoard.description ?? ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">
                    {t("labels.posts", { count })}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
