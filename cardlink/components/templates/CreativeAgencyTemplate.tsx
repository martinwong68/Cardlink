"use client";

// Creative Agency Template - Bold, vibrant, and artistic

import { useMemo, useState } from "react";
import { Sparkles, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import PublicCardConnectionSection from "@/components/PublicCardConnectionSection";
import type { TemplateRendererProps } from "./types";

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

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "");
}

function ensureUrl(value: string, fallbackPrefix = "https://") {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `${fallbackPrefix}${value}`;
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
    case "LinkedIn":
      return ensureUrl(normalizeHandle(trimmed), "https://linkedin.com/in/");
    case "Instagram":
      return ensureUrl(normalizeHandle(trimmed), "https://instagram.com/");
    case "Twitter":
      return ensureUrl(normalizeHandle(trimmed), "https://x.com/");
    case "Website":
      return ensureUrl(trimmed);
    default:
      return ensureUrl(trimmed);
  }
}

function buildExternalUrl(value: string) {
  return ensureUrl(value.trim());
}

export default function CreativeAgencyTemplate(props: TemplateRendererProps) {
  const { fullName, title, company, bio, slug, avatarUrl, backgroundColor, vcardHref, cardFields, cardLinks, ownerId, viewerId, viewerPlan } = props;
  const t = useTranslations("publicCard");
  const accentColor = backgroundColor ?? "#a855f7";
  const [toast, setToast] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return base ? `${base}/c/${slug}` : typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : "";
  }, [slug]);

  const visibleFields = [...cardFields].filter((f) => f.visibility === "public").sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const sortedLinks = [...cardLinks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast(t("toast.linkCopied"));
      setTimeout(() => setToast(null), 2200);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-violet-50 to-fuchsia-50 pb-16">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <section className="relative overflow-hidden rounded-[30px] bg-slate-900 p-5 shadow-2xl">
            <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full blur-3xl" style={{ backgroundColor: hexToRgba(accentColor, 0.45) }} />
            <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full blur-3xl" style={{ backgroundColor: hexToRgba(accentColor, 0.35) }} />
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Creative
                </span>
                <span className="text-xs text-white/70">Portfolio Card</span>
              </div>

              <div className="mt-5 flex items-start gap-4">
                <div className="h-24 w-24 overflow-hidden rounded-2xl border-2 border-white/30 bg-white/10">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white">
                      {getInitials(fullName)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-3xl font-black text-white">{fullName}</h1>
                  {(title || company) ? (
                    <p className="mt-1 truncate text-sm" style={{ color: hexToRgba(accentColor, 0.9) }}>{[title, company].filter(Boolean).join(" • ")}</p>
                  ) : null}
                </div>
              </div>

              {bio ? <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/80">{bio}</p> : null}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <a
                  href={vcardHref}
                  download
                  className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Save Contact
                </a>
                <button
                  onClick={handleShare}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition brightness-100 hover:brightness-95"
                  style={{ backgroundColor: accentColor }}
                >
                  Share Profile
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border bg-white p-5 shadow-xl" style={{ borderColor: hexToRgba(accentColor, 0.35) }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: hexToRgba(accentColor, 0.8) }}>Highlights</p>
            {visibleFields.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {visibleFields.map((field, idx) => {
                  const targetUrl = buildContactUrl(field.field_type, field.field_value);
                  if (!targetUrl) {
                    return null;
                  }
                  const isDirectScheme = targetUrl.startsWith("mailto:") || targetUrl.startsWith("tel:");
                  const alpha = 0.35 - (idx % 4) * 0.06;
                  return (
                    <div key={field.id} className="rounded-xl p-[1px]" style={{ backgroundColor: hexToRgba(accentColor, Math.max(alpha, 0.16)) }}>
                      <a
                        href={targetUrl}
                        target={isDirectScheme ? undefined : "_blank"}
                        rel={isDirectScheme ? undefined : "noreferrer"}
                        className="flex items-center gap-2.5 rounded-[11px] bg-white px-3.5 py-3 transition hover:bg-slate-50"
                      >
                        <span
                          className="rounded-md p-1.5"
                          style={{
                            backgroundColor: hexToRgba(accentColor, 0.2),
                            color: hexToRgba(accentColor, 0.95),
                          }}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </span>
                        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">{field.field_label || field.field_type}</p>
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No public fields.</p>
            )}
          </section>
        </div>

        <div className="mt-5 rounded-3xl bg-white/85 p-6 shadow-lg backdrop-blur">
          <PublicCardConnectionSection ownerId={ownerId} slug={slug} viewerId={viewerId} viewerPlan={viewerPlan} cardFields={cardFields} vcardHref={vcardHref} showFields={false} showSaveContact={false} />
        </div>

        {sortedLinks.length > 0 && (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {sortedLinks.map((link) => (
              <a key={link.id} href={buildExternalUrl(link.url)} target="_blank" rel="noreferrer" className="group flex items-center justify-between rounded-2xl bg-white p-4 shadow-md transition hover:shadow-lg">
                <span className="font-semibold text-slate-900">{link.label}</span>
                <span style={{ color: accentColor }}>↗</span>
              </a>
            ))}
          </div>
        )}

        <footer className="mt-12 text-center">
          <a href="/" className="text-xs font-semibold" style={{ color: accentColor }}>
            {t("footer.madeWith")}
          </a>
        </footer>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 font-bold text-white shadow-2xl"
          style={{ backgroundColor: accentColor }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
