"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";
import RelativeTime from "@/components/RelativeTime";

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
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type PostRow = {
  id: string;
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

export default function SubBoardPage() {
  const params = useParams();
  const boardSlug = Array.isArray(params.boardSlug)
    ? params.boardSlug[0]
    : params.boardSlug;
  const subBoardSlug = Array.isArray(params.subBoardSlug)
    ? params.subBoardSlug[0]
    : params.subBoardSlug;
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("communityDashboardSubBoard");
  const [board, setBoard] = useState<BoardRow | null>(null);
  const [subBoard, setSubBoard] = useState<SubBoardRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadSubBoard = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: boardData } = await supabase
      .from("boards")
      .select("id, name, slug, description, icon")
      .eq("slug", boardSlug)
      .maybeSingle();

    if (!boardData) {
      setMessage(t("errors.boardNotFound"));
      setIsLoading(false);
      return;
    }

    const { data: subBoardData } = await supabase
      .from("sub_boards")
      .select("id, name, slug, description")
      .eq("board_id", boardData.id)
      .eq("slug", subBoardSlug)
      .maybeSingle();

    if (!subBoardData) {
      setMessage(t("errors.subBoardNotFound"));
      setIsLoading(false);
      return;
    }

    const { data: postData } = await supabase
      .from("forum_posts")
      .select(
        "id, title, body, reply_count, last_activity_at, created_at, profiles!author_id(id, full_name, avatar_url)"
      )
      .eq("sub_board_id", subBoardData.id)
      .eq("is_banned", false)
      .order("last_activity_at", { ascending: false, nullsFirst: false });

    setBoard(boardData);
    setSubBoard(subBoardData);
    setPosts(postData ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    if (boardSlug && subBoardSlug) {
      void loadSubBoard();
    }
  }, [boardSlug, subBoardSlug]);

  const handleCreatePost = async () => {
    if (!title.trim() || !body.trim() || !subBoard) {
      return;
    }

    setIsPosting(true);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setMessage(t("errors.signInToPost"));
      setIsPosting(false);
      return;
    }

    const { error } = await supabase.from("forum_posts").insert({
      author_id: userData.user.id,
      sub_board_id: subBoard.id,
      title: title.trim(),
      body: body.trim(),
      last_activity_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
      setIsPosting(false);
      return;
    }

    setTitle("");
    setBody("");
    await loadSubBoard();
    setIsPosting(false);
  };

  if (isLoading) {
    return (
      <div className="app-card p-6 text-center text-sm text-gray-500">
        {t("states.loading")}
      </div>
    );
  }

  if (!board || !subBoard) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600 shadow-sm">
        {message ?? t("errors.subBoardNotFound")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/community/${board.slug}`}
          className="app-kicker"
        >
          {board.name}
        </Link>
        <h1 className="app-title mt-2 text-2xl font-semibold">
          {subBoard.name}
        </h1>
        <p className="app-subtitle mt-2 text-sm">
          {subBoard.description}
        </p>
      </div>

      <div className="app-card p-5">
        <h2 className="text-sm font-semibold text-gray-900">{t("sections.newPost")}</h2>
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("placeholders.postTitle")}
            className="app-input px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder={t("placeholders.postBody")}
            className="app-input w-full resize-none px-3 py-2 text-sm"
          />
          {message ? (
            <p className="text-xs text-rose-500">{message}</p>
          ) : null}
          <button
            onClick={handleCreatePost}
            disabled={isPosting}
            className="app-primary-btn px-5 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPosting ? t("actions.posting") : t("actions.publish")}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            {t("empty.noPosts")}
          </div>
        ) : null}

        {posts.map((post) => {
          const author = normalizeSingle(post.profiles);
          const authorName = author?.full_name ?? t("defaults.member");
          const initials = getInitials(authorName);
          const lastActivity = post.last_activity_at ?? post.created_at;

          return (
            <Link
              key={post.id}
              href={`/dashboard/community/${board.slug}/${subBoard.slug}/${post.id}`}
              className="app-card block p-4 transition hover:-translate-y-0.5 hover:border-indigo-200"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {post.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {authorName}
                    </p>
                  </div>
                </div>
                <RelativeTime
                  className="text-xs text-gray-400"
                  date={lastActivity}
                />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {(post.body ?? "").slice(0, 160)}
                {post.body && post.body.length > 160 ? "..." : ""}
              </p>
              <div className="mt-3 text-xs text-gray-400">
                {t("labels.replies", { count: post.reply_count ?? 0 })}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
