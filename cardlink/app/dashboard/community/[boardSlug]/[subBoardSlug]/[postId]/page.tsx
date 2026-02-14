"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/src/lib/supabase/client";
import RelativeTime from "@/components/RelativeTime";

type BoardRow = {
  id: string;
  name: string | null;
  slug: string | null;
  icon: string | null;
};

type SubBoardRow = {
  id: string;
  name: string | null;
  slug: string | null;
  boards?: BoardRow[] | BoardRow | null;
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
  author_id: string;
  reply_count: number | null;
  created_at: string;
  updated_at: string | null;
  last_activity_at: string | null;
  profiles?: ProfileRow[] | ProfileRow | null;
  sub_boards?: SubBoardRow[] | SubBoardRow | null;
};

type ReplyRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
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

export default function PostDetailPage() {
  const params = useParams();
  const supabase = useMemo(() => createClient(), []);
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const [post, setPost] = useState<PostRow | null>(null);
  const [board, setBoard] = useState<BoardRow | null>(null);
  const [subBoard, setSubBoard] = useState<SubBoardRow | null>(null);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPost = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    setViewerId(userData?.user?.id ?? null);

    const { data: postData, error: postError } = await supabase
      .from("forum_posts")
      .select(
        "id, title, body, author_id, reply_count, created_at, updated_at, last_activity_at, profiles!author_id(id, full_name, avatar_url), sub_boards(id, name, slug, boards(id, name, slug, icon))"
      )
      .eq("id", postId)
      .eq("is_banned", false)
      .maybeSingle();

    if (postError || !postData) {
      setMessage("Post not found.");
      setIsLoading(false);
      return;
    }

    const { data: replyData } = await supabase
      .from("forum_replies")
      .select("id, post_id, author_id, body, created_at, updated_at, profiles!author_id(id, full_name, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    const subBoardData = normalizeSingle(postData.sub_boards);
    const boardData = normalizeSingle(subBoardData?.boards ?? null);

    setPost(postData);
    setSubBoard(subBoardData);
    setBoard(boardData);
    setReplies(replyData ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    if (postId) {
      void loadPost();
    }
  }, [postId]);

  const handleReply = async () => {
    if (!replyBody.trim() || !viewerId) {
      setMessage("Please sign in to reply.");
      return;
    }

    setIsPosting(true);
    setMessage(null);

    const { error } = await supabase.from("forum_replies").insert({
      post_id: postId,
      author_id: viewerId,
      body: replyBody.trim(),
    });

    if (error) {
      setMessage(error.message);
      setIsPosting(false);
      return;
    }

    await supabase
      .from("forum_posts")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", postId);

    setReplyBody("");
    await loadPost();
    setIsPosting(false);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        Loading post...
      </div>
    );
  }

  if (!post || !subBoard || !board) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600 shadow-sm">
        {message ?? "Post not found."}
      </div>
    );
  }

  const author = normalizeSingle(post.profiles);
  const authorName = author?.full_name ?? "CardLink Member";
  const initials = getInitials(authorName);
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/community/${board.slug}/${subBoard.slug}`}
          className="text-xs font-semibold text-violet-600"
        >
          {subBoard.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {post.title}
        </h1>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {authorName}
              </p>
              <p className="text-xs text-slate-500">
                <RelativeTime date={post.created_at} />
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400">
            {post.reply_count ?? 0} replies
          </span>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
          {post.body}
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {message}
        </p>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Replies</h2>

        {replies.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            No replies yet.
          </div>
        ) : null}

        {replies.map((reply) => {
          const replyAuthor = normalizeSingle(reply.profiles);
          const replyName = replyAuthor?.full_name ?? "CardLink Member";
          const replyInitials = getInitials(replyName);
          return (
            <div
              key={reply.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
                    {replyInitials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {replyName}
                    </p>
                    <p className="text-xs text-slate-500">
                      <RelativeTime date={reply.created_at} />
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                {reply.body}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Add a reply</h2>
        <textarea
          value={replyBody}
          onChange={(event) => setReplyBody(event.target.value)}
          rows={4}
          placeholder="Write your reply..."
          className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Replies are visible to everyone in this sub-board.
          </span>
          <button
            onClick={handleReply}
            disabled={isPosting}
            className="rounded-full bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPosting ? "Posting..." : "Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
