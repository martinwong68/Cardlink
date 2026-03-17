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

type TabKey = "info" | "contact" | "links" | "experience";

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

export default function FullscreenHeroTabsTemplate(props: TemplateRendererProps) {
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
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [toast, setToast] = useState<string | null>(null);
  const [wechatValue, setWechatValue] = useState<string | null>(null);

  const patternClass =
    patternClassMap[backgroundPattern ?? "gradient-4"] ??
    patternClassMap["gradient-4"];
  const accentColor = backgroundColor ?? "#2563eb";

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
    <div className="app-shell relative min-h-screen overflow-hidden pb-16">
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
      <div className="absolute inset-0 bg-slate-950/75" />

      <section className="relative flex items-center px-4 pb-8 pt-8">

        <div className="app-page relative w-full max-w-5xl">
          <div className="rounded-3xl border border-slate-700/70 bg-gray-900/70 p-6 backdrop-blur-lg sm:p-7">
            <div className="grid gap-4 sm:grid-cols-[96px_1fr] sm:items-center">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-600 bg-gray-800 text-3xl font-bold text-white sm:h-24 sm:w-24">
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
                <h1 className="text-3xl font-bold text-white sm:text-4xl">{fullName}</h1>
                {(title || company) ? (
                  <p className="mt-1 text-sm text-gray-300">
                    {[title, company].filter(Boolean).join(" • ")}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-indigo-300/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-100">
                    Available for Work
                  </span>
                  {title ? (
                    <span className="rounded-full border border-slate-500/60 bg-gray-800/80 px-3 py-1 text-xs font-semibold text-slate-200">
                      {title}
                    </span>
                  ) : null}
                  {company ? (
                    <span className="rounded-full border border-slate-500/60 bg-gray-800/80 px-3 py-1 text-xs font-semibold text-slate-200">
                      {company}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {bio ? (
              <p className="mt-4 text-sm text-gray-300">
                {bio}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="app-page relative mt-2 max-w-5xl px-4 pb-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              activeTab === "info"
                ? "border-indigo-500/70 bg-indigo-500/20 text-indigo-100"
                : "border-slate-700 bg-gray-900 text-slate-200"
            }`}
          >
            簡介與資訊
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contact")}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              activeTab === "contact"
                ? "border-indigo-500/70 bg-indigo-500/20 text-indigo-100"
                : "border-slate-700 bg-gray-900 text-slate-200"
            }`}
          >
            {t("sections.contact")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("links")}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              activeTab === "links"
                ? "border-indigo-500/70 bg-indigo-500/20 text-indigo-100"
                : "border-slate-700 bg-gray-900 text-slate-200"
            }`}
          >
            {t("sections.links")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("experience")}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              activeTab === "experience"
                ? "border-indigo-500/70 bg-indigo-500/20 text-indigo-100"
                : "border-slate-700 bg-gray-900 text-slate-200"
            }`}
          >
            {t("sections.experience")}
          </button>
        </div>
      </section>

      <section className="app-page relative max-w-5xl px-4 pt-4">
        {activeTab === "info" ? (
          <div className="rounded-3xl border border-slate-700 bg-gray-900 p-6 shadow-lg">
            <h2 className="app-kicker">簡介與資訊</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
                <p className="text-xs text-gray-400">姓名</p>
                <p className="mt-1 text-sm text-slate-100">{fullName}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
                <p className="text-xs text-gray-400">職稱</p>
                <p className="mt-1 text-sm text-slate-100">{title || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
                <p className="text-xs text-gray-400">公司</p>
                <p className="mt-1 text-sm text-slate-100">{company || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 sm:col-span-2">
                <p className="text-xs text-gray-400">簡介</p>
                <p className="mt-1 text-sm text-slate-200">{bio || "-"}</p>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "contact" ? (
          <div className="rounded-3xl border border-slate-700 bg-gray-900 p-6 shadow-lg">
            <h2 className="app-kicker">{t("sections.contact")}</h2>
            {visibleFields.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">{t("empty.contact")}</p>
            ) : (
              <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(56px,1fr))] gap-3">
                {visibleFields.map((field) => {
                  const Icon = iconByType[field.field_type] ?? User;
                  return (
                    <button
                      key={field.id}
                      type="button"
                      title={field.field_value}
                      aria-label={field.field_label || field.field_type}
                      onClick={() => handleContactClick(field.field_type, field.field_value)}
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-200"
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "links" ? (
          <div className="rounded-3xl border border-slate-700 bg-gray-900 p-6 shadow-lg">
            <h2 className="app-kicker">{t("sections.links")}</h2>
            {sortedLinks.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">{t("empty.links")}</p>
            ) : (
              <div className="mt-4 grid grid-flow-col auto-cols-[70px] gap-3 overflow-x-auto pb-2">
                {sortedLinks.map((link) => {
                  const LinkIcon = getLinkIcon(link.url, link.icon);
                  return (
                    <a
                      key={link.id}
                      href={buildExternalUrl(link.url)}
                      target="_blank"
                      rel="noreferrer"
                      title={link.label}
                      className="flex h-[70px] w-[70px] items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-200"
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
          </div>
        ) : null}

        {activeTab === "experience" ? (
          <div className="rounded-3xl border border-slate-700 bg-gray-900 p-6 shadow-lg">
            <h2 className="app-kicker">{t("sections.experience")}</h2>
            {sortedExperiences.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">{t("empty.experience")}</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {sortedExperiences.map((experience) => (
                  <div
                    key={experience.id}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  >
                    <h4 className="text-sm font-semibold text-slate-100">
                      {t("experience.roleAt", {
                        role: experience.role,
                        company: experience.company,
                      })}
                    </h4>
                    <p className="mt-1 text-xs text-gray-400">
                      {experience.description || "-"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
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
          </div>
        ) : null}
      </section>

      <section className="app-page relative max-w-5xl px-4 pt-5">
        <div className="rounded-3xl border border-slate-700 bg-gray-900 p-5 shadow-lg">
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
        </div>
      </section>

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
