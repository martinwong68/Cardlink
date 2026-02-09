"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Globe, Lock, MessageCircle, RefreshCw, ThumbsUp } from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";

type PostVisibility = "public" | "friends";

type ProfileRow = {
  id: string;
  full_name: string | null;
  title?: string | null;
  company?: string | null;
};

type PostRow = {
  id: string;
  user_id: string;
  content: string;
  visibility: PostVisibility;
  created_at: string;
  profiles: ProfileRow[] | null;
};

type PostRowRaw = Omit<PostRow, "profiles"> & {
  profiles: ProfileRow[] | ProfileRow | null;
};

const PAGE_SIZE = 20;

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

export default function FeedPage() {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [friendIds, setFriendIds] = useState<string[]>([]);

  const loadViewer = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      setViewerId(null);
      setFriendIds([]);
      return { userId: null as string | null, friendIds: [] as string[] };
    }

    setViewerId(data.user.id);

    const { data: connections } = await supabase
      .from("connections")
      .select("requester_id, receiver_id")
      .or(
        `and(requester_id.eq.${data.user.id},status.eq.accepted),and(receiver_id.eq.${data.user.id},status.eq.accepted)`
      );

    const ids = (connections ?? []).map((row) =>
      row.requester_id === data.user!.id ? row.receiver_id : row.requester_id
    );
    setFriendIds(ids);

    return { userId: data.user.id, friendIds: ids };
  };

  const fetchPosts = async (pageIndex: number, reset = false) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setMessage(null);

    const viewerSnapshot = await loadViewer();
    const currentViewerId = viewerSnapshot.userId;
    const activeFriendIds = viewerSnapshot.friendIds;

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("posts")
      .select(
        "id, user_id, content, visibility, created_at, profiles(id, full_name, title, company)"
      )
      .order("created_at", { ascending: false });

    if (currentViewerId && activeFriendIds.length > 0) {
      query = query.or(
        `visibility.eq.public,and(visibility.eq.friends,user_id.in.(${activeFriendIds.join(",")}))`
      );
    } else {
      query = query.eq("visibility", "public");
    }

    const { data, error } = await query.range(from, to);

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    const nextPosts = (data ?? []).map((post) => {
      const raw = post as PostRowRaw;
      const profile = Array.isArray(raw.profiles)
        ? raw.profiles[0] ?? null
        : raw.profiles ?? null;

      return { ...raw, profiles: profile } as PostRow;
    });
    setPosts((prev) => (reset ? nextPosts : [...prev, ...nextPosts]));
    setHasMore(nextPosts.length === PAGE_SIZE);
    setIsLoading(false);
    setIsLoadingMore(false);
  };

  useEffect(() => {
    void fetchPosts(0, true);
  }, []);

  const handlePost = async () => {
    if (!content.trim()) {
      return;
    }

    setIsPosting(true);
    setMessage(null);

    const viewerSnapshot = await loadViewer();
    const currentViewerId = viewerSnapshot.userId;

    if (!currentViewerId) {
      setMessage("Please sign in to post.");
      setIsPosting(false);
      return;
    }

    const { error } = await supabase.from("posts").insert({
      user_id: currentViewerId,
      content: content.trim(),
      visibility,
    });

    if (error) {
      setMessage(error.message);
      setIsPosting(false);
      return;
    }

    setContent("");
    setPage(0);
    await fetchPosts(0, true);
    setIsPosting(false);
  };

  const handleRefresh = async () => {
    setPage(0);
    await fetchPosts(0, true);
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchPosts(nextPage, false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
              CardLink
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Feed</h1>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
          >
            <RefreshCw className="h-4 w-4" />
            Load new posts
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What’s on your mind?"
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              {visibility === "public" ? (
                <Globe className="h-3.5 w-3.5 text-violet-600" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-violet-600" />
              )}
              <select
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value as PostVisibility)
                }
                className="bg-transparent text-xs font-semibold text-slate-600 outline-none"
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
              </select>
            </div>
            <button
              onClick={handlePost}
              disabled={isPosting}
              className="rounded-full bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPosting ? "Posting..." : "Post"}
            </button>
          </div>

          {message ? (
            <p className="mt-3 text-xs text-rose-500">{message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {isLoading && posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Loading feed...
          </div>
        ) : null}

        {posts.map((post) => {
          const profile = post.profiles?.[0] ?? null;
          const authorName = profile?.full_name ?? "CardLink User";
          const initials = getInitials(authorName);
          const subtitle = [profile?.title, profile?.company]
            .filter(Boolean)
            .join(" @ ");

          return (
            <div
              key={post.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
                  {initials}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {authorName}
                    </p>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {subtitle ? (
                    <p className="text-xs text-slate-500">{subtitle}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold uppercase text-violet-600">
                  {post.visibility === "public" ? "Public" : "Friends"}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-700 whitespace-pre-wrap">
                {post.content}
              </p>
              <div className="mt-4 flex gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  0
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  0
                </span>
              </div>
            </div>
          );
        })}

        {!isLoading && posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            No posts yet. Start the conversation.
          </div>
        ) : null}
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="rounded-full border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
