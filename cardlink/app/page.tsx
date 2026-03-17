import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { zhCN, zhHK, zhTW } from "date-fns/locale";
import { getLocale, getTranslations } from "next-intl/server";

import { createClient } from "@/src/lib/supabase/server";

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

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

type PreviewPost = {
  id: string;
  title: string;
  body: string;
  reply_count: number | null;
  last_activity_at: string | null;
  created_at: string;
  profiles?: ProfileRow[] | ProfileRow | null;
  sub_boards?: SubBoardRow[] | SubBoardRow | null;
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

function normalizeSingle<T>(value: T[] | T | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const dateLocale =
    locale === "zh-CN" ? zhCN : locale === "zh-TW" ? zhTW : locale === "zh-HK" ? zhHK : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard/community");
  }

  const { data: posts } = await supabase
    .from("forum_posts")
    .select(
      "id, title, body, reply_count, last_activity_at, created_at, sub_boards(id, name, slug, boards(id, name, slug, icon)), profiles!author_id(id, full_name, avatar_url)"
    )
    .eq("is_banned", false)
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .limit(8);

  const previewPosts = ((posts ?? []) as PreviewPost[]).map((post) => {
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
    <div className="app-shell">
      <header className="border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="app-page flex items-center justify-between py-6">
          <p className="app-kicker">
            {t("brand")}
          </p>
          <Link
            href="/auth"
            className="app-secondary-btn px-4 py-2 text-xs font-semibold"
          >
            {t("actions.signIn")}
          </Link>
        </div>
      </header>

      <main className="app-page py-10">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="app-kicker">
              {t("hero.kicker")}
            </p>
            <h1 className="app-title text-4xl font-semibold sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="app-subtitle text-base sm:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth"
                className="app-primary-btn px-6 py-3 text-sm font-semibold"
              >
                {t("actions.getStarted")}
              </Link>
              <Link
                href="/community"
                className="app-secondary-btn px-6 py-3 text-sm font-semibold"
              >
                {t("actions.browseCommunity")}
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: t("features.share.title"),
                  text: t("features.share.body"),
                },
                {
                  label: t("features.crm.title"),
                  text: t("features.crm.body"),
                },
                {
                  label: t("features.discover.title"),
                  text: t("features.discover.body"),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="app-card p-4"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="app-card-soft p-6">
            <p className="app-kicker">
              {t("forum.kicker")}
            </p>
            <div className="mt-4 space-y-4">
              {previewPosts.length === 0 ? (
                <div className="app-card p-4 text-center text-sm text-gray-500">
                  {t("forum.empty")}
                </div>
              ) : (
                previewPosts.map((post) => {
                  const name = post.author?.full_name ?? t("forum.member");
                  const initials = getInitials(name);
                  const lastActivity = post.last_activity_at ?? post.created_at;
                  const boardLabel = [post.board?.icon, post.board?.name]
                    .filter(Boolean)
                    .join(" ");
                  const subBoardLabel = post.subBoard?.name ?? "";

                  return (
                    <div
                      key={post.id}
                      className="app-card p-4"
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
                              {name}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(lastActivity), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-gray-500">
                        {(post.body ?? "").slice(0, 120)}
                        {post.body && post.body.length > 120 ? "..." : ""}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                        <span>
                          {boardLabel}
                          {boardLabel && subBoardLabel ? " • " : ""}
                          {subBoardLabel}
                        </span>
                        <span>
                          {t("forum.replies", { count: post.reply_count ?? 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-6 border-t border-white/70 py-8">
        <div className="app-page text-xs text-gray-400">
          {t("brand")}
        </div>
      </footer>
    </div>
  );
}
