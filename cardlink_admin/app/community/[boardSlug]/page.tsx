"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { zhCN, zhHK, zhTW } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

type BoardRow = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  icon: string | null;
};

type SubBoardRow = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  sort_order: number | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type PostRow = {
  id: string;
  sub_board_id: string;
  title: string;
  body: string;
  reply_count: number | null;
  last_activity_at: string | null;
  created_at: string;
  profiles?: ProfileRow[] | ProfileRow | null;
};

function normalizeSingle<T>(value: T[] | T | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

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

export default function PublicBoardPage() {
  const params = useParams();
  const boardSlug = Array.isArray(params.boardSlug)
    ? params.boardSlug[0]
    : params.boardSlug;
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("communityBoard");
  const locale = useLocale();
  const dateLocale =
    locale === "zh-CN" ? zhCN : locale === "zh-TW" ? zhTW : locale === "zh-HK" ? zhHK : undefined;
  const [board, setBoard] = useState<BoardRow | null>(null);
  const [subBoards, setSubBoards] = useState<SubBoardRow[]>([]);
  const [postsBySubBoard, setPostsBySubBoard] = useState<
    Record<string, PostRow[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadBoard = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: boardData } = await supabase
      .from("boards")
      .select("id, name, slug, description, icon")
      .eq("slug", boardSlug)
      .maybeSingle();

    if (!boardData) {
      setMessage(t("errors.notFound"));
      setIsLoading(false);
      return;
    }

    const { data: subBoardData } = await supabase
      .from("sub_boards")
      .select("id, name, slug, description, sort_order")
      .eq("board_id", boardData.id)
      .order("sort_order", { ascending: true });

    const subBoardIds = (subBoardData ?? []).map((sub) => sub.id);

    const { data: postData } = subBoardIds.length
      ? await supabase
          .from("forum_posts")
          .select(
            "id, sub_board_id, title, body, reply_count, last_activity_at, created_at, profiles(id, full_name, avatar_url)"
          )
          .in("sub_board_id", subBoardIds)
          .order("last_activity_at", { ascending: false, nullsFirst: false })
          .limit(30)
      : { data: [] as PostRow[] };

    const grouped: Record<string, PostRow[]> = {};
    (postData ?? []).forEach((post) => {
      const list = grouped[post.sub_board_id] ?? [];
      list.push(post);
      grouped[post.sub_board_id] = list;
    });

    setBoard(boardData);
    setSubBoards(subBoardData ?? []);
    setPostsBySubBoard(grouped);
    setIsLoading(false);
  };

  useEffect(() => {
    if (boardSlug) {
      void loadBoard();
    }
  }, [boardSlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          {t("loading")}
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-white px-4 py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600 shadow-sm">
          {message ?? t("errors.notFound")}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
          <Link
            href="/community"
            className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600"
          >
            {t("brand")}
          </Link>
          <Link
            href="/auth"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
          >
            {t("actions.loginToPost")}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10">
        <div>
          <Link href="/community" className="text-xs font-semibold text-violet-600">
            {t("actions.community")}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            <span className="mr-2">{board.icon}</span>
            {board.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{board.description}</p>
        </div>

        <div className="space-y-6">
          {subBoards.map((subBoard) => {
            const posts = postsBySubBoard[subBoard.id] ?? [];

            return (
              <section
                key={subBoard.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {subBoard.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {subBoard.description}
                    </p>
                  </div>
                  <Link
                    href={`/community/${board.slug}/${subBoard.slug}`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
                  >
                    {t("actions.view")}
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {posts.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      {t("emptyPosts")}
                    </div>
                  ) : null}

                  {posts.slice(0, 3).map((post) => {
                    const author = normalizeSingle(post.profiles);
                    const authorName = author?.full_name ?? t("member");
                    const initials = getInitials(authorName);
                    const lastActivity = post.last_activity_at ?? post.created_at;

                    return (
                      <Link
                        key={post.id}
                        href={`/community/${board.slug}/${subBoard.slug}/${post.id}`}
                        className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {post.title}
                              </p>
                              <p className="text-xs text-slate-500">
                                {authorName}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(lastActivity), {
                              addSuffix: true,
                              locale: dateLocale,
                            })}
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          {(post.body ?? "").slice(0, 140)}
                          {post.body && post.body.length > 140 ? "..." : ""}
                        </p>
                        <div className="mt-3 text-xs text-slate-400">
                          {t("stats.replies", { count: post.reply_count ?? 0 })}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
