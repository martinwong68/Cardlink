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
  Email: "bg-rose-500 text-white",
  WhatsApp: "bg-emerald-600 text-white",
  LinkedIn: "bg-sky-600 text-white",
  WeChat: "bg-green-600 text-white",
  Telegram: "bg-sky-500 text-white",
  Instagram: "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 text-white",
  Twitter: "bg-slate-900 text-white",
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
      const digits = trimmed.replace(/[^0-9]/g, "");
      return digits ? `https://wa.me/${digits}` : null;
    }
    case "LinkedIn":
      return ensureUrl(trimmed, "https://linkedin.com/in/");
    case "Telegram":
      return `https://t.me/${normalizeHandle(trimmed)}`;
    case "Instagram":
      return `https://instagram.com/${normalizeHandle(trimmed)}`;
    case "Twitter":
      return `https://x.com/${normalizeHandle(trimmed)}`;
    case "Website":
      return ensureUrl(trimmed);
    default:
      return ensureUrl(trimmed);
  }
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
  const coverStyle = {
    "--cardlink-base": backgroundColor ?? "#1e40af",
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
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto w-full max-w-lg px-4 pb-10">
        <section
          className="cardlink-section cardlink-delay-1 relative mt-6 overflow-hidden rounded-3xl shadow-md"
          style={coverStyle}
        >
          <div
            className={`cardlink-cover ${patternClass} h-52 w-full md:h-64`}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/10" />
          <div className="absolute -bottom-10 left-1/2 flex -translate-x-1/2 items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-lg">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-lg font-semibold text-white"
                  style={{ backgroundColor: backgroundColor ?? "#1e40af" }}
                >
                  {initials}
                </div>
              )}
            </div>
          </div>
          <div className="h-12" />
        </section>

        <section className="cardlink-section cardlink-delay-2 mt-12 rounded-3xl bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {fullName}
            </h1>
            {(title || company) && (
              <p className="text-sm text-slate-500">
                {[title, company].filter(Boolean).join(" • ")}
              </p>
            )}
          </div>
          {bio ? (
            <p className="mt-4 text-sm text-slate-600">{bio}</p>
          ) : null}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href={vcardHref}
              download={`${slug || "card"}.vcf`}
              className="flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:text-violet-600"
            >
              {t("actions.saveContact")}
            </a>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              {t("actions.share")}
            </button>
          </div>
        </section>

        <section className="cardlink-section cardlink-delay-3 mt-6 rounded-3xl bg-white p-6 shadow-sm">
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
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t("sections.contact")}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleFields.length === 0 ? (
              <p className="col-span-full text-sm text-slate-500">
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
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-semibold shadow-sm transition hover:opacity-90 ${brandClass}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-center leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {sortedLinks.length > 0 ? (
          <section className="cardlink-section cardlink-delay-5 mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("sections.links")}
            </h2>
            <div className="mt-4 space-y-3">
              {sortedLinks.map((link) => (
                <a
                  key={link.id}
                  href={ensureUrl(link.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">
                      {link.icon ? link.icon : "🔗"}
                    </span>
                    {link.label}
                  </span>
                  <Link2 className="h-4 w-4 text-slate-400" />
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {sortedExperiences.length > 0 ? (
          <section className="cardlink-section cardlink-delay-6 mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("sections.experience")}
            </h2>
            <div className="mt-5 space-y-6">
              {sortedExperiences.map((experience) => (
                <div key={experience.id} className="relative pl-6">
                  <span className="absolute left-0 top-1.5 h-full w-px bg-slate-200" />
                  <span className="absolute left-[-5px] top-1.5 h-3 w-3 rounded-full bg-indigo-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {t("experience.roleAt", {
                        role: experience.role,
                        company: experience.company,
                      })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateRange(
                        experience.start_date,
                        experience.end_date,
                        locale,
                        t("experience.present")
                      )}
                    </p>
                    {experience.description ? (
                      <p className="mt-2 text-xs text-slate-600">
                        {experience.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="mt-8 text-center text-xs text-slate-400">
          <a href="/" className="hover:text-indigo-600">
            {t("footer.madeWith")}
          </a>
        </footer>
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
