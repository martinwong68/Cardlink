"use client";

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

export default function ProfileCommunityTemplate(props: TemplateRendererProps) {
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
    patternClassMap[backgroundPattern ?? "gradient-2"] ??
    patternClassMap["gradient-2"];
  const accentColor = backgroundColor ?? "#7c3aed";

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
    <div className="app-shell min-h-screen pb-16">
      <div className="app-page max-w-4xl px-4 py-8">
        <section className="app-card relative overflow-hidden rounded-[2rem] p-7">
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
          <div className="absolute inset-0 bg-slate-950/45" />

          <div className="relative grid gap-4 sm:grid-cols-[92px_1fr] sm:items-center">
            <div className="flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/25 bg-white/15 text-3xl font-bold text-white">
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
              <h1 className="text-3xl font-bold text-white">{fullName}</h1>
              {(title || company) && (
                <p className="mt-1 text-sm text-white/85">
                  {[title, company].filter(Boolean).join(" • ")}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {title ? (
                  <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    {title}
                  </span>
                ) : null}
                {company ? (
                  <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    {company}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-2">
            <a
              href={vcardHref}
              download={`${slug || "card"}.vcf`}
              className="app-secondary-btn bg-white/90 px-4 py-2 text-sm font-semibold"
            >
              {t("actions.saveContact")}
            </a>
            <button
              type="button"
              onClick={handleShare}
              className="app-primary-btn px-4 py-2 text-sm font-semibold"
            >
              {t("actions.share")}
            </button>
          </div>
        </section>

        <section className="app-card mt-5 rounded-[1.6rem] p-6">
          <h2 className="app-kicker">簡介與資訊</h2>
          <div className="mt-4 grid gap-3">
            <div className="app-card-soft grid grid-cols-[92px_1fr] items-center gap-3 rounded-2xl px-4 py-3 text-sm">
              <span className="app-subtitle">姓名</span>
              <span className="font-semibold text-gray-700">{fullName}</span>
            </div>
            {(title || company) && (
              <div className="app-card-soft grid grid-cols-[92px_1fr] items-center gap-3 rounded-2xl px-4 py-3 text-sm">
                <span className="app-subtitle">職稱 / 公司</span>
                <span className="font-semibold text-gray-700">
                  {[title, company].filter(Boolean).join(" • ")}
                </span>
              </div>
            )}
            {bio ? (
              <div className="app-card-soft grid grid-cols-[92px_1fr] items-start gap-3 rounded-2xl px-4 py-3 text-sm">
                <span className="app-subtitle">簡介</span>
                <span className="text-gray-700">{bio}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="app-card mt-5 rounded-[1.6rem] p-6">
          <h2 className="app-kicker">{t("sections.contact")}</h2>
          {visibleFields.length === 0 ? (
            <p className="app-subtitle mt-4 text-sm">{t("empty.contact")}</p>
          ) : (
            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(64px,1fr))] gap-3">
              {visibleFields.map((field) => {
                const Icon = iconByType[field.field_type] ?? User;

                return (
                  <button
                    key={field.id}
                    type="button"
                    title={field.field_value}
                    aria-label={field.field_label || field.field_type}
                    onClick={() =>
                      handleContactClick(field.field_type, field.field_value)
                    }
                    className="app-card-soft mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-dashed transition hover:border-indigo-200"
                  >
                    <Icon className="h-5 w-5 text-gray-600" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="app-card mt-5 rounded-[1.6rem] p-6">
          <h2 className="app-kicker">{t("sections.links")}</h2>
          {sortedLinks.length === 0 ? (
            <p className="app-subtitle mt-4 text-sm">{t("empty.links")}</p>
          ) : (
            <div className="mt-4 grid grid-flow-col auto-cols-[4.5rem] gap-3 overflow-x-auto pb-2">
              {sortedLinks.map((link) => {
                const LinkIcon = getLinkIcon(link.url, link.icon);
                return (
                  <a
                    key={link.id}
                    href={buildExternalUrl(link.url)}
                    target="_blank"
                    rel="noreferrer"
                    title={link.label}
                    className="flex flex-col items-center gap-2"
                  >
                    <span className="app-card-soft flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl text-gray-600">
                      {LinkIcon ? (
                        <LinkIcon className="h-6 w-6" />
                      ) : (
                        <span className="text-xl">{link.icon || "🔗"}</span>
                      )}
                    </span>
                    <span className="line-clamp-1 w-full text-center text-[11px] text-gray-500">
                      {link.label}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        <section className="app-card mt-5 rounded-[1.6rem] p-6">
          <h2 className="app-kicker">{t("sections.experience")}</h2>
          {sortedExperiences.length === 0 ? (
            <p className="app-subtitle mt-4 text-sm">{t("empty.experience")}</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {sortedExperiences.map((experience) => (
                <div
                  key={experience.id}
                  className="rounded-2xl border border-gray-100 p-4"
                  style={{
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, var(--cardlink-base) 14%, white), var(--app-surface))",
                    "--cardlink-base": accentColor,
                  } as React.CSSProperties}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {t("experience.roleAt", {
                      role: experience.role,
                      company: experience.company,
                    })}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
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
              ))}
            </div>
          )}
        </section>

        <section className="app-card mt-5 rounded-[1.6rem] p-5">
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
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
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
