"use client";

// Modern Tech Template - Contemporary design with dark theme

import { useMemo, useState } from "react";
import { Mail, Phone, Globe, Linkedin, Github, Twitter, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import PublicCardConnectionSection from "@/components/PublicCardConnectionSection";
import type { TemplateRendererProps } from "./types";

const techIcons: Record<string, any> = {
  Phone, Email: Mail, Website: Globe, LinkedIn: Linkedin, GitHub: Github, Twitter,
};

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (parts[0]?.slice(0, 2).toUpperCase() || "CL");
}

export default function ModernTechTemplate(props: TemplateRendererProps) {
  const { fullName, title, company, bio, slug, avatarUrl, backgroundColor, vcardHref, cardFields, cardLinks, ownerId, viewerId, viewerPlan } = props;
  const t = useTranslations("publicCard");
  const [toast, setToast] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return base ? `${base}/c/${slug}` : typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : "";
  }, [slug]);

  const visibleFields = cardFields.filter((f) => f.visibility === "public").sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const sortedLinks = cardLinks.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast(t("toast.linkCopied"));
      setTimeout(() => setToast(null), 2200);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 pb-16">
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        {/* Hero Section with Grid Pattern */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-800/50 p-8 backdrop-blur-sm">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          <div className="relative flex flex-col items-center gap-6 sm:flex-row">
            {/* Avatar */}
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-indigo-500/30 bg-slate-700 shadow-xl">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-indigo-400" style={{ backgroundColor: backgroundColor ?? "#6366f1" }}>
                  {getInitials(fullName)}
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-white">{fullName}</h1>
              {(title || company) && <p className="mt-1 text-indigo-300">{[title, company].filter(Boolean).join(" @ ")}</p>}
              {bio && <p className="mt-3 text-sm text-slate-300">{bio}</p>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative mt-6 flex flex-wrap gap-3">
            <a href={vcardHref} download className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 backdrop-blur-sm transition hover:bg-indigo-500/20">
              Save Contact
            </a>
            <button onClick={handleShare} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
              Share
            </button>
          </div>
        </div>

        {/* Connection */}
        <div className="mt-6 rounded-2xl bg-slate-800/30 p-6 backdrop-blur-sm">
          <PublicCardConnectionSection ownerId={ownerId} slug={slug} viewerId={viewerId} viewerPlan={viewerPlan} cardFields={cardFields} vcardHref={vcardHref} showFields={false} showSaveContact={false} />
        </div>

        {/* Contact Grid */}
        {visibleFields.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFields.map((field) => {
              const Icon = techIcons[field.field_type] || Link2;
              return (
                <div key={field.id} className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 backdrop-blur-sm transition hover:border-indigo-500/50 hover:bg-slate-800/50">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-indigo-500/20 p-2">
                      <Icon className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-400">{field.field_label || field.field_type}</p>
                      <p className="mt-1 text-sm font-medium text-white">{field.field_value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Links */}
        {sortedLinks.length > 0 && (
          <div className="mt-6 space-y-2">
            {sortedLinks.map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3 backdrop-blur-sm transition hover:border-indigo-500/50 hover:bg-slate-800/50">
                <span className="text-sm font-medium text-white">{link.label}</span>
                <span className="text-indigo-400">→</span>
              </a>
            ))}
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-slate-500">
          <a href="/" className="hover:text-indigo-400">{t("footer.madeWith")}</a>
        </footer>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">{toast}</div>}
    </div>
  );
}
