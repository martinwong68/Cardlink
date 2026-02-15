"use client";

// Creative Agency Template - Bold, vibrant, and artistic

import { useMemo, useState } from "react";
import { Mail, Phone, Instagram, Link2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import PublicCardConnectionSection from "@/components/PublicCardConnectionSection";
import type { TemplateRendererProps } from "./types";

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (parts[0]?.slice(0, 2).toUpperCase() || "CL");
}

export default function CreativeAgencyTemplate(props: TemplateRendererProps) {
  const { fullName, title, company, bio, slug, avatarUrl, backgroundColor, vcardHref, cardFields, cardLinks, ownerId, viewerId, viewerPlan } = props;
  const t = useTranslations("publicCard");
  const [toast, setToast] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return base ? `${base}/c/${slug}` : typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : "";
  }, [slug]);

  const visibleFields = cardFields.filter((f) => f.visibility === "public");
  const sortedLinks = cardLinks.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast(t("toast.linkCopied"));
      setTimeout(() => setToast(null), 2200);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 pb-16">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {/* Artistic Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-1 shadow-2xl">
          <div className="rounded-[2.3rem] bg-white p-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              {/* Avatar with gradient border */}
              <div className="relative">
                <div className="absolute -inset-2 animate-pulse rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 opacity-75 blur-lg"></div>
                <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-violet-400 to-pink-400 shadow-xl">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                      {getInitials(fullName)}
                    </div>
                  )}
                </div>
              </div>
              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <h1 className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-4xl font-black text-transparent">{fullName}</h1>
                  <Sparkles className="h-6 w-6 text-fuchsia-500" />
                </div>
                {(title || company) && <p className="mt-2 text-lg font-semibold text-slate-700">{[title, company].filter(Boolean).join(" • ")}</p>}
                {bio && <p className="mt-3 text-slate-600">{bio}</p>}
              </div>
            </div>

            {/* Vibrant Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={vcardHref} download className="rounded-full border-2 border-violet-600 bg-white px-6 py-3 font-bold text-violet-600 shadow-lg transition hover:bg-violet-50">
                Save Contact
              </a>
              <button onClick={handleShare} className="rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-6 py-3 font-bold text-white shadow-lg transition hover:shadow-xl">
                Share Profile
              </button>
            </div>
          </div>
        </div>

        {/* Connection */}
        <div className="mt-6 rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur">
          <PublicCardConnectionSection ownerId={ownerId} slug={slug} viewerId={viewerId} viewerPlan={viewerPlan} cardFields={cardFields} vcardHref={vcardHref} showFields={false} showSaveContact={false} />
        </div>

        {/* Contact Cards - Colorful Grid */}
        {visibleFields.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {visibleFields.map((field, idx) => {
              const colors = ["from-violet-500 to-purple-500", "from-fuchsia-500 to-pink-500", "from-pink-500 to-rose-500", "from-purple-500 to-fuchsia-500"];
              const gradientClass = colors[idx % colors.length];
              return (
                <div key={field.id} className={`group rounded-2xl bg-gradient-to-br ${gradientClass} p-1 shadow-lg transition hover:scale-105 hover:shadow-xl`}>
                  <div className="rounded-[0.875rem] bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{field.field_label || field.field_type}</p>
                    <p className="mt-2 font-semibold text-slate-900">{field.field_value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Links with gradient hover */}
        {sortedLinks.length > 0 && (
          <div className="mt-6 space-y-3">
            {sortedLinks.map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between rounded-2xl bg-white p-4 shadow-md transition hover:scale-[1.02] hover:shadow-lg">
                <span className="font-semibold text-slate-900 group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-fuchsia-600 group-hover:bg-clip-text group-hover:text-transparent">{link.label}</span>
                <span className="text-fuchsia-500">↗</span>
              </a>
            ))}
          </div>
        )}

        <footer className="mt-12 text-center">
          <a href="/" className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-xs font-semibold text-transparent hover:from-pink-600 hover:to-violet-600">
            {t("footer.madeWith")}
          </a>
        </footer>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-bold text-white shadow-2xl">{toast}</div>}
    </div>
  );
}
