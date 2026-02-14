"use client";

import Link from "next/link";
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
  sort_order: number | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type BoardJoin = {
  id: string;
  name: string | null;
  slug: string | null;
  icon: string | null;
};

type SubBoardJoin = {
  id: string;
  name: string | null;
  slug: string | null;
  boards?: BoardJoin[] | BoardJoin | null;
};

type PostRow = {
  id: string;
  title: string;
  body: string;
  reply_count: number | null;
  last_activity_at: string | null;
  created_at: string;
  profiles?: ProfileRow[] | ProfileRow | null;
  sub_boards?: SubBoardJoin[] | SubBoardJoin | null;
};

type PostCountRow = {
  sub_boards?: { board_id: string | null }[] | { board_id: string | null } | null;
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

export default function PublicCommunityPage() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("community");
  const locale = useLocale();
  const dateLocale =
    locale === "zh-CN" ? zhCN : locale === "zh-TW" ? zhTW : locale === "zh-HK" ? zhHK : undefined;
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadBoards = async () => {
    setIsLoading(true);
    setMessage(null);

    const [{ data: boardData, error: boardError }, { data: postData }] =
      await Promise.all([
        supabase
          .from("boards")
          .select("id, name, slug, description, icon, sort_order")
          .order("sort_order", { ascending: true }),
        supabase
          .from("forum_posts")
          .select("id, sub_boards(board_id)")
          .eq("is_banned", false)
          .order("created_at", { ascending: false }),
      ]);

    if (boardError) {
      setMessage(boardError.message);
      setIsLoading(false);
      return;
    }

    const counts: Record<string, number> = {};
    (postData ?? []).forEach((post) => {
      const subBoard = normalizeSingle((post as PostCountRow).sub_boards);
      const boardId = subBoard?.board_id ?? null;
      if (!boardId) {
        return;
      }
      counts[boardId] = (counts[boardId] ?? 0) + 1;
    });

    setBoards(boardData ?? []);
    setPostCounts(counts);
    setIsLoading(false);
  };

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("forum_posts")
      .select(
        "id, title, body, reply_count, last_activity_at, created_at, sub_boards(id, name, slug, boards(id, name, slug, icon)), profiles!author_id(id, full_name, avatar_url)"
      )
      .eq("is_banned", false)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .limit(8);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPosts(data ?? []);
  };

  useEffect(() => {
    void loadBoards();
    void loadPosts();
  }, []);

  const normalizedPosts = posts.map((post) => {
    const author = normalizeSingle(post.profiles);
    const subBoard = normalizeSingle(post.sub_boards);
    const board = normalizeSingle(subBoard?.boards ?? null);

    return {
      ...post,
      author,
      subBoard,
      board,
    };
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
          <Link
            href="/"
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

      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("subtitle")}
          </p>
        </div>

        {message ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {message}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              {t("loadingBoards")}
            </div>
          ) : null}

          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/community/${board.slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-200"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    <span className="mr-2">{board.icon}</span>
                    {board.name}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {board.description}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {t("stats.posts", { count: postCounts[board.id] ?? 0 })}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("latest.title")}
          </h2>

          <div className="space-y-3">
            {normalizedPosts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
                {t("latest.empty")}
              </div>
            ) : null}

            {normalizedPosts.map((post) => {
              const authorName = post.author?.full_name ?? t("member");
              const initials = getInitials(authorName);
              const lastActivity = post.last_activity_at ?? post.created_at;

              return (
                <Link
                  key={post.id}
                  href={`/community/${post.board?.slug}/${post.subBoard?.slug}/${post.id}`}
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
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {[post.board?.icon, post.board?.name]
                        .filter(Boolean)
                        .join(" ")}
                      {post.subBoard?.name ? ` • ${post.subBoard.name}` : ""}
                    </span>
                    <span>
                      {t("stats.replies", { count: post.reply_count ?? 0 })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
