"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";

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
      setMessage("Board not found.");
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
      setMessage("Sub-board not found.");
      setIsLoading(false);
      return;
    }

    const { data: postData } = await supabase
      .from("forum_posts")
      .select(
        "id, title, body, reply_count, last_activity_at, created_at, profiles(id, full_name, avatar_url)"
      )
      .eq("sub_board_id", subBoardData.id)
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
      setMessage("Please sign in to post.");
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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        Loading posts...
      </div>
    );
  }

  if (!board || !subBoard) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600 shadow-sm">
        {message ?? "Sub-board not found."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/community/${board.slug}`}
          className="text-xs font-semibold text-violet-600"
        >
          {board.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {subBoard.name}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {subBoard.description}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">New Post</h2>
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Post title"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="Write something thoughtful..."
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
          />
          {message ? (
            <p className="text-xs text-rose-500">{message}</p>
          ) : null}
          <button
            onClick={handleCreatePost}
            disabled={isPosting}
            className="rounded-full bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPosting ? "Posting..." : "Publish"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            No posts yet.
          </div>
        ) : null}

        {posts.map((post) => {
          const author = normalizeSingle(post.profiles);
          const authorName = author?.full_name ?? "CardLink Member";
          const initials = getInitials(authorName);
          const lastActivity = post.last_activity_at ?? post.created_at;

          return (
            <Link
              key={post.id}
              href={`/dashboard/community/${board.slug}/${subBoard.slug}/${post.id}`}
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
                  })}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {(post.body ?? "").slice(0, 160)}
                {post.body && post.body.length > 160 ? "..." : ""}
              </p>
              <div className="mt-3 text-xs text-slate-400">
                {post.reply_count ?? 0} replies
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
