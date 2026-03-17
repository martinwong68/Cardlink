"use client";

// Classic Business Template - Traditional corporate style
// This is essentially the current default template with minor modifications

import { useMemo, useState } from "react";
import {
  AtSign,
  Globe,
  Instagram,
  Link2,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Twitter,
  User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import PublicCardConnectionSection from "@/components/PublicCardConnectionSection";
import type { TemplateRendererProps } from "./types";

const patternClassMap: Record<string, string> = {
  "gradient-1": "cardlink-pattern-gradient-1",
  "gradient-2": "cardlink-pattern-gradient-2",
  "gradient-3": "cardlink-pattern-gradient-3",
  "gradient-4": "cardlink-pattern-gradient-4",
  "gradient-5": "cardlink-pattern-gradient-5",
  "pattern-dots": "cardlink-pattern-dots",
  "pattern-waves": "cardlink-pattern-waves",
  "pattern-grid": "cardlink-pattern-grid",
  "pattern-circles": "cardlink-pattern-circles",
  "pattern-topography": "cardlink-pattern-topography",
};

const brandStyles: Record<string, string> = {
  Phone: "bg-emerald-500 text-white",
  Email: "bg-red-500 text-white",
  WhatsApp: "bg-emerald-600 text-white",
  LinkedIn: "bg-sky-600 text-white",
  WeChat: "bg-green-600 text-white",
  Telegram: "bg-sky-500 text-white",
  Instagram: "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 text-white",
  Twitter: "bg-gray-900 text-white",
  Website: "bg-indigo-600 text-white",
  Other: "bg-slate-700 text-white",
};

const iconByType: Record<string, typeof User> = {
  Phone,
  Email: Mail,
  WhatsApp: MessageCircle,
  LinkedIn: Link2,
  WeChat: MessageCircle,
  Telegram: Send,
  Instagram,
  Twitter,
  Website: Globe,
  Other: AtSign,
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

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "");
}

function isSpecialScheme(value: string) {
  return /^(mailto:|tel:)/i.test(value);
}

function looksLikeDomain(value: string, domain: string) {
  return value.toLowerCase().includes(domain);
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
      const handle = normalizeHandle(trimmed).replace(/^in\//i, "");
      return `https://linkedin.com/in/${handle}`;
    }
    case "Telegram":
      return /^https?:\/\//i.test(trimmed) || looksLikeDomain(trimmed, "t.me")
        ? ensureUrl(trimmed)
        : `https://t.me/${normalizeHandle(trimmed)}`;
    case "Instagram":
      return /^https?:\/\//i.test(trimmed) || looksLikeDomain(trimmed, "instagram.com")
        ? ensureUrl(trimmed)
        : `https://instagram.com/${normalizeHandle(trimmed)}`;
    case "Twitter":
      return /^https?:\/\//i.test(trimmed) || looksLikeDomain(trimmed, "x.com") || looksLikeDomain(trimmed, "twitter.com")
        ? ensureUrl(trimmed)
        : `https://x.com/${normalizeHandle(trimmed)}`;
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

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return "";
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "numeric",
    }).format(date);
  }
  return value;
}

function formatDateRange(
  start: string | null,
  end: string | null,
  locale: string,
  presentLabel: string
) {
  const startLabel = formatDate(start, locale);
  const endLabel = end ? formatDate(end, locale) : presentLabel;
  if (!startLabel && !endLabel) {
    return "";
  }
  return `${startLabel || ""} — ${endLabel}`.trim();
}

export default function ClassicBusinessTemplate(props: TemplateRendererProps) {
  const {
    fullName,
    title,
    company,
    bio,
    slug,
    avatarUrl,
    backgroundPattern,
    backgroundColor,
    backgroundImageUrl,
    vcardHref,
    cardFields,
    cardLinks,
    cardExperiences,
    ownerId,
    viewerId,
    viewerPlan,
  } = props;

  const t = useTranslations("publicCard");
  const locale = useLocale();
  const initials = getInitials(fullName);
  const [toast, setToast] = useState<string | null>(null);
  const [wechatValue, setWechatValue] = useState<string | null>(null);
  const shareUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (base) {
      return `${base.replace(/\/$/, "")}/c/${slug}`;
    }
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/c/${slug}`;
  }, [slug]);

  const patternClass =
    patternClassMap[backgroundPattern ?? "gradient-1"] ??
    patternClassMap["gradient-1"];
  const accentColor = backgroundColor ?? "#1e40af";
  const coverStyle = {
    "--cardlink-base": accentColor,
  } as React.CSSProperties;

  const visibleFields = [...cardFields]
    .filter((field) => field.visibility === "public")
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const sortedLinks = [...cardLinks].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const sortedExperiences = [...cardExperiences].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const pushToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleShare = async () => {
    if (!shareUrl) {
      pushToast(t("errors.missingShare"));
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      pushToast(t("toast.linkCopied"));
    } catch {
      pushToast(t("errors.copyLink"));
    }
  };

  const handleContactClick = (fieldType: string, value: string) => {
    if (fieldType === "WeChat") {
      setWechatValue(value);
      return;
    }
    const target = buildContactUrl(fieldType, value);
    if (!target) {
      pushToast(t("errors.missingContact"));
      return;
    }
    if (target.startsWith("mailto:") || target.startsWith("tel:")) {
      window.location.href = target;
      return;
    }
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const handleCopyWeChat = async () => {
    if (!wechatValue) {
      return;
    }
    try {
      await navigator.clipboard.writeText(wechatValue);
      pushToast(t("toast.wechatCopied"));
    } catch {
      pushToast(t("errors.copyWechat"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      <div className="mx-auto w-full max-w-lg px-4 pb-10">
        <section
          className="cardlink-section cardlink-delay-1 relative mt-6 overflow-visible rounded-3xl shadow-lg"
          style={coverStyle}
        >
          <div className="relative overflow-hidden rounded-3xl">
            <div className={`cardlink-cover ${patternClass} h-52 w-full`} />
            {backgroundImageUrl ? (
              <img
                src={backgroundImageUrl}
                alt="Background"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/20" />
            <div className="absolute bottom-0 left-0 h-9 w-full rounded-t-[2rem] bg-gray-100/95" />
          </div>
          <div className="absolute -bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-xl">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-lg font-semibold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {initials}
                </div>
              )}
            </div>
          </div>
          <div className="h-10" />
        </section>

        <section className="cardlink-section cardlink-delay-2 mt-14 rounded-3xl bg-white p-6 shadow-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{fullName}</h1>
            {(title || company) && (
              <p className="mt-2 text-sm font-medium text-gray-500">
                {[title, company].filter(Boolean).join(" • ")}
              </p>
            )}
            {bio ? (
              <p className="mt-4 text-sm leading-relaxed text-gray-600">{bio}</p>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={vcardHref}
              download={`${slug || "card"}.vcf`}
              className="flex items-center justify-center rounded-xl border bg-white px-4 py-3 text-sm font-semibold transition"
              style={{
                borderColor: hexToRgba(accentColor, 0.3),
                color: accentColor,
              }}
            >
              {t("actions.saveContact")}
            </a>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition brightness-100 hover:brightness-95"
              style={{ backgroundColor: accentColor }}
            >
              {t("actions.share")}
            </button>
          </div>
        </section>

        <section className="cardlink-section cardlink-delay-3 mt-6 rounded-3xl bg-white p-5 shadow-sm">
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
        </section>

        <section className="cardlink-section cardlink-delay-4 mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            {t("sections.contact")}
          </h2>
          <div className="mt-4 space-y-3">
            {visibleFields.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t("empty.contact")}
              </p>
            ) : null}
            {visibleFields.map((field) => {
              const Icon = iconByType[field.field_type] ?? User;
              const label = field.field_label || field.field_type;
              const brandClass =
                brandStyles[field.field_type] ?? brandStyles.Other;

              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() =>
                    handleContactClick(field.field_type, field.field_value)
                  }
                  className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left shadow-sm transition hover:border-gray-200"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${brandClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs font-medium text-gray-400">
                      {label}
                    </span>
                    <span className="block truncate text-sm font-semibold text-gray-700">
                      {field.field_value}
                    </span>
                  </span>
                  <span className="text-gray-300">›</span>
                </button>
              );
            })}
          </div>
        </section>

        {sortedLinks.length > 0 ? (
          <section className="cardlink-section cardlink-delay-5 mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              {t("sections.links")}
            </h2>
            <div className="mt-4 space-y-3">
              {sortedLinks.map((link) => (
                <a
                  key={link.id}
                  href={buildExternalUrl(link.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-200"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">
                      {link.icon ? link.icon : "🔗"}
                    </span>
                    {link.label}
                  </span>
                  <Link2 className="h-4 w-4 text-gray-400" />
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {sortedExperiences.length > 0 ? (
          <section className="cardlink-section cardlink-delay-6 mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              {t("sections.experience")}
            </h2>
            <div className="mt-5 space-y-6">
              {sortedExperiences.map((experience) => (
                <div key={experience.id} className="relative pl-6">
                  <span className="absolute left-0 top-1.5 h-full w-px bg-gray-200" />
                  <span className="absolute left-[-5px] top-1.5 h-3 w-3 rounded-full" style={{ backgroundColor: accentColor }} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {t("experience.roleAt", {
                        role: experience.role,
                        company: experience.company,
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateRange(
                        experience.start_date,
                        experience.end_date,
                        locale,
                        t("experience.present")
                      )}
                    </p>
                    {experience.description ? (
                      <p className="mt-2 text-xs text-gray-600">
                        {experience.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="mt-8 text-center text-xs text-gray-400">
          <a href="/" style={{ color: hexToRgba(accentColor, 0.85) }}>
            {t("footer.madeWith")}
          </a>
        </footer>
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg" style={{ backgroundColor: accentColor }}>
          {toast}
        </div>
      ) : null}

      {wechatValue ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {t("wechat.title")}
              </h3>
              <button
                type="button"
                onClick={() => setWechatValue(null)}
                className="text-sm font-semibold text-gray-400 hover:text-gray-600"
              >
                {t("wechat.close")}
              </button>
            </div>
            <p className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {wechatValue}
            </p>
            <button
              type="button"
              onClick={handleCopyWeChat}
              className="mt-4 w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              {t("wechat.copy")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
