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
      "id, title, body, reply_count, last_activity_at, created_at, sub_boards(id, name, slug, boards(id, name, slug, icon)), profiles(id, full_name, avatar_url)"
    )
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
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
            {t("brand")}
          </p>
          <Link
            href="/auth"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
          >
            {t("actions.signIn")}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-500">
              {t("hero.kicker")}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="text-base text-slate-500 sm:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth"
                className="rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                {t("actions.getStarted")}
              </Link>
              <Link
                href="/community"
                className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-600"
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
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
              {t("forum.kicker")}
            </p>
            <div className="mt-4 space-y-4">
              {previewPosts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
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
                      className="rounded-2xl border border-slate-200 bg-white p-4"
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
                              {name}
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
                        {(post.body ?? "").slice(0, 120)}
                        {post.body && post.body.length > 120 ? "..." : ""}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
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

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto w-full max-w-6xl px-4 text-xs text-slate-400">
          {t("brand")}
        </div>
      </footer>
    </div>
  );
}
