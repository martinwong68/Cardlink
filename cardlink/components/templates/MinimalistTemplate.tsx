"use client";

// Minimalist Template - Premium white-card editorial layout

import { useMemo, useState } from "react";
import { Mail, Phone, Globe, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
  if (!trimmed) {
    return null;
  }

  const isSpecialScheme = /^(mailto:|tel:)/i.test(trimmed);
  const hasDomain = (domain: string) => trimmed.toLowerCase().includes(domain);

  switch (fieldType) {
    case "Email": return `mailto:${trimmed}`;
    case "Phone": return `tel:${trimmed}`;
    case "WhatsApp": {
      if (isSpecialScheme || hasDomain("wa.me") || hasDomain("whatsapp.com")) {
        return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      }
      const digits = trimmed.replace(/[^0-9]/g, "");
      return digits ? `https://wa.me/${digits}` : null;
    }
    case "LinkedIn": {
      if (trimmed.startsWith("http") || hasDomain("linkedin.com")) {
        return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      }
      const handle = trimmed.replace(/^@/, "").replace(/^in\//i, "");
      return `https://linkedin.com/in/${handle}`;
    }
    case "GitHub":
      return trimmed.startsWith("http") || hasDomain("github.com")
        ? (trimmed.startsWith("http") ? trimmed : `https://${trimmed}`)
        : `https://github.com/${trimmed.replace(/^@/, "")}`;
    case "Twitter":
      return trimmed.startsWith("http") || hasDomain("x.com") || hasDomain("twitter.com")
        ? (trimmed.startsWith("http") ? trimmed : `https://${trimmed}`)
        : `https://x.com/${trimmed.replace(/^@/, "")}`;
    case "Instagram":
      return trimmed.startsWith("http") || hasDomain("instagram.com")
        ? (trimmed.startsWith("http") ? trimmed : `https://${trimmed}`)
        : `https://instagram.com/${trimmed.replace(/^@/, "")}`;
    case "Telegram":
      return trimmed.startsWith("http") || hasDomain("t.me")
        ? (trimmed.startsWith("http") ? trimmed : `https://${trimmed}`)
        : `https://t.me/${trimmed.replace(/^@/, "")}`;
    case "Website": return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    default: return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  }
}

function buildExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "#";
  }
  if (/^(mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

export default function MinimalistTemplate(props: TemplateRendererProps) {
  const {
    fullName, title, company, bio, slug, avatarUrl, backgroundColor,
    vcardHref, cardFields, cardLinks, ownerId, viewerId, viewerPlan,
  } = props;

  const t = useTranslations("publicCard");
  const initials = getInitials(fullName);
  const accentColor = backgroundColor ?? "#64748b";
  const [toast, setToast] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return base ? `${base.replace(/\/$/, "")}/c/${slug}` : typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : "";
  }, [slug]);

  const visibleFields = [...cardFields].filter((f) => f.visibility === "public").sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const sortedLinks = [...cardLinks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

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
    <div className="min-h-screen bg-slate-100 pb-16 pt-6">
      <div className="mx-auto w-full max-w-xl px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-xl font-semibold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">{fullName}</h1>
              {(title || company) ? (
                <p className="mt-1 truncate text-sm text-slate-500">
                  {[title, company].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
          </div>

          {bio ? <p className="mt-5 text-sm leading-relaxed text-slate-600">{bio}</p> : null}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={vcardHref}
              download={`${slug || "card"}.vcf`}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t("actions.saveContact")}
            </a>
            <button
              onClick={handleShare}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-white transition brightness-100 hover:brightness-95"
              style={{ backgroundColor: accentColor }}
            >
              {t("actions.share")}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <PublicCardConnectionSection
            ownerId={ownerId}
            slug={slug}
            viewerId={viewerId}
            viewerPlan={viewerPlan}
            cardFields={cardFields}
            vcardHref={vcardHref}
            showFields={false}
            showSaveContact={false}
          />
        </div>

        {visibleFields.length > 0 ? (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2.5">
              {visibleFields.map((field) => {
                const Icon = iconByType[field.field_type] || Link2;
                const targetUrl = buildContactUrl(field.field_type, field.field_value);
                if (!targetUrl) {
                  return null;
                }
                return (
                  <a
                    key={field.id}
                    href={targetUrl}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 transition hover:border-slate-300"
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm"
                      style={{ color: accentColor }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-slate-400">{field.field_label || field.field_type}</span>
                      <span className="block truncate text-sm font-medium text-slate-700">{field.field_value}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        ) : null}

        {sortedLinks.length > 0 ? (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2.5">
              {sortedLinks.map((link) => (
                <a
                  key={link.id}
                  href={buildExternalUrl(link.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="truncate">{link.label}</span>
                  <span className="text-slate-400">→</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <footer className="mt-6 text-center text-xs text-slate-400">
          <a href="/" className="hover:text-slate-500">{t("footer.madeWith")}</a>
        </footer>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-light text-white shadow-lg"
          style={{ backgroundColor: accentColor }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
