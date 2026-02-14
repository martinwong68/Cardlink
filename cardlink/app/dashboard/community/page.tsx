"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/src/lib/supabase/client";
import RelativeTime from "@/components/RelativeTime";

type BoardRow = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  icon: string | null;
  sort_order: number | null;
};

type BoardLite = {
  id: string;
  name: string | null;
  slug: string | null;
  icon: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type SubBoardRow = {
  id: string;
  name: string | null;
  slug: string | null;
  board_id: string | null;
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
  author?: ProfileRow | null;
  subBoard?: SubBoardRow | null;
  board?: BoardLite | null;
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
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadBoards = useCallback(async () => {
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
          .select("id, sub_board_id")
          .eq("is_banned", false)
          .order("created_at", { ascending: false }),
      ]);

    if (boardError) {
      setMessage(boardError.message);
      setIsLoading(false);
      return;
    }

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
      if (!boardId) {
        return;
      }
      counts[boardId] = (counts[boardId] ?? 0) + 1;
    });

    setBoards(boardData ?? []);
    setPostCounts(counts);
    setIsLoading(false);
  }, [supabase]);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("forum_posts")
      .select(
        "id, title, body, reply_count, last_activity_at, created_at, author_id, sub_board_id"
      )
      .eq("is_banned", false)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      setMessage(error.message);
      return;
    }


    const rawPosts = (data ?? []) as PostRow[];
    const authorIds = Array.from(
      new Set(rawPosts.map((post) => post.author_id).filter(Boolean))
    );
    const subBoardIds = Array.from(
      new Set(rawPosts.map((post) => post.sub_board_id).filter(Boolean))
    );

    const [{ data: profileData }, { data: subBoardData }] =
      await Promise.all([
        authorIds.length
          ? supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .in("id", authorIds)
          : Promise.resolve({ data: [] as ProfileRow[] }),
        subBoardIds.length
          ? supabase
              .from("sub_boards")
              .select("id, name, slug, board_id")
              .in("id", subBoardIds)
          : Promise.resolve({ data: [] as SubBoardRow[] }),
      ]);

    const boardIds = Array.from(
      new Set((subBoardData ?? []).map((sub) => sub.board_id).filter(Boolean))
    );
    const { data: boardData } = boardIds.length
      ? await supabase
          .from("boards")
          .select("id, name, slug, icon")
          .in("id", boardIds)
      : { data: [] as BoardLite[] };

    const profileMap = new Map(
      (profileData ?? []).map((profile) => [profile.id, profile])
    );
    const subBoardMap = new Map(
      (subBoardData ?? []).map((sub) => [sub.id, sub])
    );
    const boardMap = new Map(
      (boardData ?? []).map((board) => [board.id, board])
    );

    const nextPosts = rawPosts.map((post) => {
      const subBoard = subBoardMap.get(post.sub_board_id) ?? null;
      const board = subBoard?.board_id
        ? boardMap.get(subBoard.board_id) ?? null
        : null;

      return {
        ...post,
        author: profileMap.get(post.author_id) ?? null,
        subBoard,
        board,
      };
    });

    setPosts(nextPosts);
  }, [supabase]);

  useEffect(() => {
    void loadBoards();
    void loadPosts();
  }, [loadBoards, loadPosts]);

  useEffect(() => {
    const handleFocus = () => {
      void loadPosts();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadPosts();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadPosts]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          CardLink
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Community
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Browse boards and join the conversation.
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
            Loading boards...
          </div>
        ) : null}

        {boards.map((board) => (
          <Link
            key={board.id}
            href={`/dashboard/community/${board.slug}`}
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
                {postCounts[board.id] ?? 0} posts
              </span>
            </div>
          </Link>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Latest from the community
          </h2>
          <Link
            href="/community"
            className="text-xs font-semibold text-violet-600"
          >
            View public feed
          </Link>
        </div>

        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              No posts yet.
            </div>
          ) : null}

          {posts.map((post) => {
            const authorName = post.author?.full_name ?? "CardLink Member";
            const initials = getInitials(authorName);
            const lastActivity = post.last_activity_at ?? post.created_at;

            return (
              <Link
                key={post.id}
                href={`/dashboard/community/${post.board?.slug}/${post.subBoard?.slug}/${post.id}`}
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
                  <RelativeTime
                    className="text-xs text-slate-400"
                    date={lastActivity}
                  />
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
                  <span>{post.reply_count ?? 0} replies</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
