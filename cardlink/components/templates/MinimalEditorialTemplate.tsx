"use client";

import { useState } from "react";
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
      if (
        isSpecialScheme(trimmed) ||
        looksLikeDomain(trimmed, "wa.me") ||
        looksLikeDomain(trimmed, "whatsapp.com")
      ) {
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

function getLinkIcon(url: string, fallbackIcon: string | null | undefined) {
  const normalized = url.toLowerCase();
  if (normalized.includes("instagram")) {
    return Instagram;
  }
  if (normalized.includes("linkedin")) {
    return Link2;
  }
  if (normalized.includes("x.com") || normalized.includes("twitter")) {
    return Twitter;
  }
  if (normalized.includes("t.me") || normalized.includes("telegram")) {
    return Send;
  }
  if (normalized.includes("wa.me") || normalized.includes("whatsapp")) {
    return MessageCircle;
  }
  if (fallbackIcon && fallbackIcon.trim()) {
    return null;
  }
  return Globe;
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

export default function MinimalEditorialTemplate(props: TemplateRendererProps) {
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

  const patternClass =
    patternClassMap[backgroundPattern ?? "gradient-3"] ??
    patternClassMap["gradient-3"];
  const accentColor = backgroundColor ?? "#0ea5e9";

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
    <div className="app-shell min-h-screen pb-16">
      <div className="app-page max-w-5xl px-4 py-8">
        <section className="app-card relative grid gap-4 overflow-hidden rounded-3xl border-2 border-slate-900 bg-white p-6">
          <div
            className={`cardlink-cover ${patternClass} absolute inset-0`}
            style={{ "--cardlink-base": accentColor } as React.CSSProperties}
          />
          {backgroundImageUrl ? (
            <img
              src={backgroundImageUrl}
              alt="Background"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-white/75" />

          <div className="relative ml-auto rounded-full border-2 border-slate-900 bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            Available
          </div>

          <div className="relative grid gap-4 sm:grid-cols-[96px_1fr] sm:items-center">
            <div
              className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 bg-white text-3xl font-extrabold text-slate-900"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--cardlink-base) 30%, white), transparent 65%)",
                "--cardlink-base": accentColor,
              } as React.CSSProperties}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">{fullName}</h1>
              {(title || company) ? (
                <p className="mt-1 text-sm text-slate-600">
                  {[title, company].filter(Boolean).join(" • ")}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {title ? (
                  <span className="rounded-full border-2 border-dashed border-slate-900 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {title}
                  </span>
                ) : null}
                {company ? (
                  <span className="rounded-full border-2 border-dashed border-slate-900 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {company}
                  </span>
                ) : null}
                {!title && !company ? (
                  <span className="rounded-full border-2 border-dashed border-slate-900 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    CardLink
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="app-card mt-5 rounded-3xl border-2 border-slate-900 p-6">
          <h2 className="app-kicker">簡介與資訊</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">姓名</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{fullName}</p>
            </div>
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">職稱</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{title || "-"}</p>
            </div>
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">公司</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{company || "-"}</p>
            </div>
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 sm:col-span-2">
              <p className="text-xs text-slate-500">簡介</p>
              <p className="mt-1 text-sm text-slate-700">{bio || "-"}</p>
            </div>
          </div>
        </section>

        <section className="app-card mt-5 rounded-3xl border-2 border-slate-900 p-6">
          <h2 className="app-kicker">{t("sections.contact")}</h2>
          {visibleFields.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{t("empty.contact")}</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              {visibleFields.map((field) => {
                const Icon = iconByType[field.field_type] ?? User;
                return (
                  <button
                    key={field.id}
                    type="button"
                    title={field.field_value}
                    aria-label={field.field_label || field.field_type}
                    onClick={() => handleContactClick(field.field_type, field.field_value)}
                    className="app-card-soft flex h-14 w-14 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-900"
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="app-card mt-5 rounded-3xl border-2 border-slate-900 p-6">
          <h2 className="app-kicker">{t("sections.links")}</h2>
          {sortedLinks.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{t("empty.links")}</p>
          ) : (
            <div className="mt-4 grid grid-flow-col auto-cols-[72px] gap-3 overflow-x-auto pb-2">
              {sortedLinks.map((link) => {
                const LinkIcon = getLinkIcon(link.url, link.icon);
                return (
                  <a
                    key={link.id}
                    href={buildExternalUrl(link.url)}
                    target="_blank"
                    rel="noreferrer"
                    title={link.label}
                    className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-2 border-slate-900 bg-white text-slate-900"
                  >
                    {LinkIcon ? (
                      <LinkIcon className="h-6 w-6" />
                    ) : (
                      <span className="text-xl">{link.icon || "🔗"}</span>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </section>

        <section className="app-card mt-5 rounded-3xl border-2 border-slate-900 p-6">
          <h2 className="app-kicker">{t("sections.experience")}</h2>
          {sortedExperiences.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{t("empty.experience")}</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {sortedExperiences.map((experience) => (
                <div
                  key={experience.id}
                  className="rounded-xl border-2 border-slate-900 bg-white px-4 py-3"
                  style={{
                    borderLeftWidth: "6px",
                    borderLeftColor: "color-mix(in srgb, var(--cardlink-base) 70%, white)",
                    "--cardlink-base": accentColor,
                  } as React.CSSProperties}
                >
                  <h4 className="text-sm font-semibold text-slate-900">
                    {t("experience.roleAt", {
                      role: experience.role,
                      company: experience.company,
                    })}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600">
                    {experience.description || "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateRange(
                      experience.start_date,
                      experience.end_date,
                      locale,
                      t("experience.present")
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="app-card mt-5 rounded-3xl border-2 border-slate-900 p-5">
          <PublicCardConnectionSection
            ownerId={ownerId}
            slug={slug}
            viewerId={viewerId}
            viewerPlan={viewerPlan}
            cardFields={cardFields}
            vcardHref={vcardHref}
            showFields={false}
            showSaveContact
          />
        </section>
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {wechatValue ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {t("wechat.title")}
              </h3>
              <button
                type="button"
                onClick={() => setWechatValue(null)}
                className="text-sm font-semibold text-slate-400 hover:text-slate-600"
              >
                {t("wechat.close")}
              </button>
            </div>
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {wechatValue}
            </p>
            <button
              type="button"
              onClick={handleCopyWeChat}
              className="app-primary-btn mt-4 w-full px-4 py-3 text-sm font-semibold"
            >
              {t("wechat.copy")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
