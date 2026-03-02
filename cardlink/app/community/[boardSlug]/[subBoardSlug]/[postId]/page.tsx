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

export default function PublicPostDetailPage() {
  const params = useParams();
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("communityPost");
  const locale = useLocale();
  const dateLocale =
    locale === "zh-CN" ? zhCN : locale === "zh-TW" ? zhTW : locale === "zh-HK" ? zhHK : undefined;
  const [post, setPost] = useState<PostRow | null>(null);
  const [board, setBoard] = useState<BoardRow | null>(null);
  const [subBoard, setSubBoard] = useState<SubBoardRow | null>(null);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPost = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: postData } = await supabase
      .from("forum_posts")
      .select(
        "id, title, body, author_id, reply_count, created_at, updated_at, profiles!author_id(id, full_name, avatar_url), sub_boards(id, name, slug, boards(id, name, slug, icon))"
      )
      .eq("id", postId)
      .eq("is_banned", false)
      .maybeSingle();

    if (!postData) {
      setMessage(t("errors.notFound"));
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

  if (isLoading) {
    return (
      <div className="app-shell min-h-screen px-4 py-10">
        <div className="app-card p-6 text-center text-sm text-slate-500">
          {t("loading")}
        </div>
      </div>
    );
  }

  if (!post || !board || !subBoard) {
    return (
      <div className="app-shell min-h-screen px-4 py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600 shadow-sm">
          {message ?? t("errors.notFound")}
        </div>
      </div>
    );
  }

  const author = normalizeSingle(post.profiles);
  const authorName = author?.full_name ?? t("member");
  const initials = getInitials(authorName);

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="app-page flex items-center justify-between py-6">
          <Link
            href="/community"
            className="app-kicker"
          >
            {t("brand")}
          </Link>
          <Link
            href="/auth"
            className="app-secondary-btn px-4 py-2 text-xs font-semibold"
          >
            {t("actions.loginToPost")}
          </Link>
        </div>
      </header>

      <main className="app-page space-y-6 py-10">
        <div>
          <Link
            href={`/community/${board.slug}/${subBoard.slug}`}
            className="app-kicker"
          >
            {subBoard.name}
          </Link>
          <h1 className="app-title mt-2 text-2xl font-semibold">
            {post.title}
          </h1>
        </div>

        <div className="app-card p-6">
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
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400">
              {t("stats.replies", { count: post.reply_count ?? 0 })}
            </span>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
            {post.body}
          </p>
        </div>

        <div className="app-card-soft p-5 text-sm text-slate-600">
          {t("cta.loginToReply")}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("replies.title")}
          </h2>

          {replies.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              {t("replies.empty")}
            </div>
          ) : null}

          {replies.map((reply) => {
            const replyAuthor = normalizeSingle(reply.profiles);
            const replyName = replyAuthor?.full_name ?? t("member");
            const replyInitials = getInitials(replyName);

            return (
              <div
                key={reply.id}
                className="app-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
                    {replyInitials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {replyName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(reply.created_at), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </p>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                  {reply.body}
                </p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
