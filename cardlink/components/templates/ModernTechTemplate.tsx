"use client";

// Modern Tech Template - Contemporary design with dark theme

import { useMemo, useState } from "react";
import {
  Mail,
  Phone,
  Globe,
  Linkedin,
  Github,
  Twitter,
  Link2,
  MessageCircle,
  Send,
  Instagram,
} from "lucide-react";
import { useTranslations } from "next-intl";
import PublicCardConnectionSection from "@/components/PublicCardConnectionSection";
import type { TemplateRendererProps } from "./types";

const techIcons: Record<string, any> = {
  Phone,
  Email: Mail,
  Website: Globe,
  LinkedIn: Linkedin,
  GitHub: Github,
  Twitter,
  WhatsApp: MessageCircle,
  WeChat: MessageCircle,
  Telegram: Send,
  Instagram,
};

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (parts[0]?.slice(0, 2).toUpperCase() || "CL");
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const fullHex = normalized.length === 3
    ? normalized.split("").map((c) => c + c).join("")
    : normalized;
  const parsed = Number.parseInt(fullHex, 16);
  const red = (parsed >> 16) & 255;
  const green = (parsed >> 8) & 255;
  const blue = parsed & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function ensureUrl(value: string, fallbackPrefix = "https://") {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `${fallbackPrefix}${value}`;
}

function isSpecialScheme(value: string) {
  return /^(mailto:|tel:)/i.test(value);
}

function looksLikeDomain(value: string, domain: string) {
  return value.toLowerCase().includes(domain);
}

function buildContactUrl(fieldType: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  switch (fieldType) {
    case "Email":
      return `mailto:${trimmed}`;
    case "Phone":
      return `tel:${trimmed}`;
    case "WhatsApp": {
      if (isSpecialScheme(trimmed) || looksLikeDomain(trimmed, "wa.me") || looksLikeDomain(trimmed, "whatsapp.com")) {
        return ensureUrl(trimmed);
      }
      const digits = trimmed.replace(/[^0-9]/g, "");
      return digits ? `https://wa.me/${digits}` : null;
    }
    case "LinkedIn": {
      if (/^https?:\/\//i.test(trimmed) || looksLikeDomain(trimmed, "linkedin.com")) {
        return ensureUrl(trimmed);
      }
      const handle = trimmed.replace(/^@/, "").replace(/^in\//i, "");
      return `https://linkedin.com/in/${handle}`;
    }
    case "GitHub":
      return /^https?:\/\//i.test(trimmed) || looksLikeDomain(trimmed, "github.com")
        ? ensureUrl(trimmed)
        : `https://github.com/${trimmed.replace(/^@/, "")}`;
    case "Twitter":
      return /^https?:\/\//i.test(trimmed) || looksLikeDomain(trimmed, "x.com") || looksLikeDomain(trimmed, "twitter.com")
        ? ensureUrl(trimmed)
        : `https://x.com/${trimmed.replace(/^@/, "")}`;
    case "Instagram":
      return /^https?:\/\//i.test(trimmed) || looksLikeDomain(trimmed, "instagram.com")
        ? ensureUrl(trimmed)
        : `https://instagram.com/${trimmed.replace(/^@/, "")}`;
    case "Telegram":
      return /^https?:\/\//i.test(trimmed) || looksLikeDomain(trimmed, "t.me")
        ? ensureUrl(trimmed)
        : `https://t.me/${trimmed.replace(/^@/, "")}`;
    case "Website":
      return ensureUrl(trimmed);
    default:
      return ensureUrl(trimmed);
  }
}

function buildExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "#";
  }
  if (isSpecialScheme(trimmed) || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return ensureUrl(trimmed);
}

export default function ModernTechTemplate(props: TemplateRendererProps) {
  const { fullName, title, company, bio, slug, avatarUrl, backgroundColor, vcardHref, cardFields, cardLinks, ownerId, viewerId, viewerPlan } = props;
  const t = useTranslations("publicCard");
  const accentColor = backgroundColor ?? "#6366f1";
  const [toast, setToast] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return base ? `${base}/c/${slug}` : typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : "";
  }, [slug]);

  const visibleFields = [...cardFields].filter((f) => f.visibility === "public").sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const sortedLinks = [...cardLinks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const quickAccessItems = visibleFields
    .map((field) => {
      const url = buildContactUrl(field.field_type, field.field_value);
      if (!url) {
        return null;
      }
      return {
        id: field.id,
        label: field.field_label || field.field_type,
        fieldType: field.field_type,
        url,
      };
    })
    .filter((item): item is { id: string; label: string; fieldType: string; url: string } => item !== null);
  const primaryQuickAccess = quickAccessItems.slice(0, 8);
  const overflowQuickLinks = quickAccessItems.slice(8).map((item) => ({
    id: `field-link-${item.id}`,
    label: item.label,
    url: item.url,
    icon: null,
  }));
  const combinedLinks = [...sortedLinks, ...overflowQuickLinks];

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast(t("toast.linkCopied"));
      setTimeout(() => setToast(null), 2200);
    } catch {}
  };

  const brand = (company || "CardLink").slice(0, 24);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-16">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-[28px] border border-slate-700/60 bg-slate-900/70 p-4 shadow-2xl backdrop-blur-sm md:p-6">
          <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
            <section className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900 p-5">
              <div
                className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:24px_24px]"
                style={{ opacity: 0.55 }}
              />
              <div className="relative flex items-center justify-between">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    border: `1px solid ${hexToRgba(accentColor, 0.45)}`,
                    backgroundColor: hexToRgba(accentColor, 0.2),
                    color: hexToRgba(accentColor, 0.95),
                  }}
                >
                  Digital ID
                </span>
                <span className="max-w-[45%] truncate text-xs text-slate-400">{brand}</span>
              </div>
              <div className="relative mt-5 flex items-center gap-4">
                <div
                  className="h-24 w-24 overflow-hidden rounded-2xl bg-slate-800 shadow-xl"
                  style={{ border: `2px solid ${hexToRgba(accentColor, 0.45)}` }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white" style={{ backgroundColor: accentColor }}>
                      {getInitials(fullName)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-3xl font-bold text-white">{fullName}</h1>
                  {(title || company) ? (
                    <p className="mt-1 truncate text-sm" style={{ color: hexToRgba(accentColor, 0.92) }}>{[title, company].filter(Boolean).join(" @ ")}</p>
                  ) : null}
                </div>
              </div>
              {bio ? <p className="relative mt-4 line-clamp-3 text-sm text-slate-300">{bio}</p> : null}

              <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                  href={vcardHref}
                  download
                  className="rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition"
                  style={{
                    border: `1px solid ${hexToRgba(accentColor, 0.45)}`,
                    backgroundColor: hexToRgba(accentColor, 0.12),
                    color: hexToRgba(accentColor, 0.95),
                  }}
                >
                  Save Contact
                </a>
                <button
                  onClick={handleShare}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition brightness-100 hover:brightness-95"
                  style={{ backgroundColor: accentColor }}
                >
                  Share
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Quick Access</p>
              {primaryQuickAccess.length > 0 ? (
                <div className="mt-4 flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {primaryQuickAccess.map((item) => {
                    const Icon = techIcons[item.fieldType] || Link2;
                    const isDirectScheme = item.url.startsWith("mailto:") || item.url.startsWith("tel:");
                    return (
                      <a
                        key={item.id}
                        href={item.url}
                        target={isDirectScheme ? undefined : "_blank"}
                        rel={isDirectScheme ? undefined : "noreferrer"}
                        className="flex h-[132px] w-[132px] min-w-[132px] items-center justify-center rounded-full border-2 border-slate-600 bg-slate-800/60 transition hover:border-slate-400"
                        aria-label={item.label}
                        title={item.label}
                      >
                        <Icon className="h-10 w-10" style={{ color: hexToRgba(accentColor, 0.95) }} />
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No public fields.</p>
              )}
            </section>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 backdrop-blur-sm">
          <PublicCardConnectionSection ownerId={ownerId} slug={slug} viewerId={viewerId} viewerPlan={viewerPlan} cardFields={cardFields} vcardHref={vcardHref} showFields={false} showSaveContact={false} />
        </div>

        {combinedLinks.length > 0 && (
          <div className="mt-5 space-y-2">
            {combinedLinks.map((link) => {
              const targetUrl = buildExternalUrl(link.url);
              const isDirectScheme = targetUrl.startsWith("mailto:") || targetUrl.startsWith("tel:");
              return (
                <a
                  key={link.id}
                  href={targetUrl}
                  target={isDirectScheme ? undefined : "_blank"}
                  rel={isDirectScheme ? undefined : "noreferrer"}
                  className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 backdrop-blur-sm transition"
                  style={{ borderColor: hexToRgba(accentColor, 0.3) }}
                >
                  <span className="text-sm font-medium text-white">{link.label}</span>
                  <span style={{ color: accentColor }}>→</span>
                </a>
              );
            })}
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-slate-500">
          <a href="/" style={{ color: hexToRgba(accentColor, 0.85) }}>{t("footer.madeWith")}</a>
        </footer>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg"
          style={{ backgroundColor: accentColor }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
