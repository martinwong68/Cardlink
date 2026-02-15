"use client";

// Minimalist Template - Clean and simple design with centered layout

import { useMemo, useState } from "react";
import { Mail, Phone, Globe, Link2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import PublicCardConnectionSection from "@/components/PublicCardConnectionSection";
import type { TemplateRendererProps } from "./types";

const iconByType: Record<string, any> = {
  Phone,
  Email: Mail,
  Website: Globe,
};

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "CL";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function buildContactUrl(fieldType: string, value: string) {
  const trimmed = value.trim();
  switch (fieldType) {
    case "Email": return `mailto:${trimmed}`;
    case "Phone": return `tel:${trimmed}`;
    case "Website": return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    default: return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  }
}

export default function MinimalistTemplate(props: TemplateRendererProps) {
  const {
    fullName, title, company, bio, slug, avatarUrl, backgroundColor,
    vcardHref, cardFields, cardLinks, ownerId, viewerId, viewerPlan,
  } = props;

  const t = useTranslations("publicCard");
  const locale = useLocale();
  const initials = getInitials(fullName);
  const [toast, setToast] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return base ? `${base.replace(/\/$/, "")}/c/${slug}` : typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : "";
  }, [slug]);

  const visibleFields = cardFields.filter((f) => f.visibility === "public").sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const sortedLinks = cardLinks.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const pushToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      pushToast(t("toast.linkCopied"));
    } catch {
      pushToast(t("errors.copyLink"));
    }
  };

  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        {/* Centered Avatar */}
        <div className="flex justify-center">
          <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-slate-100 bg-slate-50 shadow-sm">
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-light text-slate-400" style={{ backgroundColor: backgroundColor ?? "#64748b" }}>
                {initials}
              </div>
            )}
          </div>
        </div>

        {/* Centered Info */}
        <div className="mt-8 text-center">
          <h1 className="text-3xl font-light tracking-tight text-slate-900">{fullName}</h1>
          {(title || company) && (
            <p className="mt-2 text-sm font-light text-slate-500">
              {[title, company].filter(Boolean).join(" · ")}
            </p>
          )}
          {bio && <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-600">{bio}</p>}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-3">
          <a href={vcardHref} download={`${slug || "card"}.vcf`} className="rounded-full border border-slate-200 px-6 py-2 text-sm font-light text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            {t("actions.saveContact")}
          </a>
          <button onClick={handleShare} className="rounded-full bg-slate-900 px-6 py-2 text-sm font-light text-white transition hover:bg-slate-800">
            {t("actions.share")}
          </button>
        </div>

        {/* Connection Section */}
        <div className="mt-8">
          <PublicCardConnectionSection ownerId={ownerId} slug={slug} viewerId={viewerId} viewerPlan={viewerPlan} cardFields={cardFields} vcardHref={vcardHref} showFields={false} showSaveContact={false} />
        </div>

        {/* Contact Fields - Minimalist Cards */}
        {visibleFields.length > 0 && (
          <div className="mt-12">
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleFields.map((field) => {
                const Icon = iconByType[field.field_type] || Link2;
                return (
                  <a key={field.id} href={buildContactUrl(field.field_type, field.field_value)} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 transition hover:border-slate-200 hover:shadow-sm">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <div className="flex-1 text-left">
                      <p className="text-xs font-light text-slate-400">{field.field_label || field.field_type}</p>
                      <p className="text-sm text-slate-700">{field.field_value}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Links */}
        {sortedLinks.length > 0 && (
          <div className="mt-8">
            <div className="space-y-2">
              {sortedLinks.map((link) => (
                <a key={link.id} href={link.url.startsWith("http") ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-200 hover:bg-slate-50">
                  <span>{link.label}</span>
                  <span className="text-slate-400">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-12 text-center text-xs font-light text-slate-300">
          <a href="/" className="hover:text-slate-400">{t("footer.madeWith")}</a>
        </footer>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-light text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
