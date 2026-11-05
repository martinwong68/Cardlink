"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  ExternalLink,
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

import InkAvatar from "./InkAvatar";
import {
  buildContactHref,
  formatExperienceRange,
  titleLine,
  type NamecardExperience,
  type NamecardField,
  type NamecardLink,
} from "./utils";

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
  Other: User,
};

type InkSignalCardProps = {
  fullName: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  slug: string;
  avatarUrl: string | null;
  vcardHref: string;
  cardFields: NamecardField[];
  cardLinks: NamecardLink[];
  cardExperiences: NamecardExperience[];
  compact?: boolean;
};

export default function InkSignalCard({
  fullName,
  title,
  company,
  bio,
  slug,
  avatarUrl,
  vcardHref,
  cardFields,
  cardLinks,
  cardExperiences,
  compact = false,
}: InkSignalCardProps) {
  const t = useTranslations("publicCard");
  const locale = useLocale();
  const [toast, setToast] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);

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

  const visibleFields = [...cardFields]
    .filter((field) => field.visibility === "public" || !field.visibility)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const sortedLinks = [...cardLinks].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const sortedExperiences = [...cardExperiences].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const roleLine = titleLine(title, company);
  const bioLong = Boolean(bio && bio.length > 120);

  const pushToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleShare = async () => {
    if (!shareUrl) {
      pushToast(t("toast.shareFailed"));
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: fullName, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      pushToast(t("toast.linkCopied"));
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        pushToast(t("toast.linkCopied"));
      } catch {
        pushToast(t("toast.shareFailed"));
      }
    }
  };

  const handleContactClick = async (field: NamecardField) => {
    if (field.field_type === "WeChat") {
      try {
        await navigator.clipboard.writeText(field.field_value);
        pushToast(t("toast.wechatCopied"));
      } catch {
        pushToast(t("errors.copyWechat"));
      }
      return;
    }

    const href = buildContactHref(field.field_type, field.field_value);
    if (!href) {
      try {
        await navigator.clipboard.writeText(field.field_value);
        pushToast(t("toast.linkCopied"));
      } catch {
        pushToast(t("errors.missingContact"));
      }
      return;
    }
    if (href.startsWith("mailto:") || href.startsWith("tel:")) {
      window.location.href = href;
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={compact ? "" : "ink-signal"}>
      <div className={compact ? "px-1 py-2" : "ink-signal-column"}>
        <header className="flex flex-col items-center text-center">
          <div className="ink-signal-fade-up">
            <InkAvatar
              name={fullName}
              src={avatarUrl}
              size={compact ? 72 : 96}
            />
          </div>
          <h1
            className={`ink-signal-display ink-signal-fade-up ink-signal-fade-up-delay-1 mt-5 ${
              compact ? "text-[22px]" : "text-[28px] md:text-[32px]"
            }`}
          >
            {fullName}
          </h1>
          {roleLine ? (
            <p className="ink-signal-fade-up ink-signal-fade-up-delay-2 mt-2 text-[15px] text-[color:var(--ink-muted)]">
              {roleLine}
            </p>
          ) : null}
          {bio ? (
            <div className="ink-signal-fade-up ink-signal-fade-up-delay-3 mt-4 w-full text-left">
              <p
                className={`text-[15px] leading-relaxed text-[color:var(--ink)] ${
                  !bioExpanded && bioLong ? "line-clamp-4" : ""
                }`}
              >
                {bio}
              </p>
              {bioLong && !compact ? (
                <button
                  type="button"
                  onClick={() => setBioExpanded((v) => !v)}
                  className="mt-2 text-sm font-semibold text-[color:var(--accent)]"
                >
                  {bioExpanded ? t("bio.less") : t("bio.more")}
                </button>
              ) : null}
            </div>
          ) : null}
        </header>

        {!compact ? (
          <div className="mt-8 grid grid-cols-2 gap-3">
            <a
              href={vcardHref}
              download={`${slug || "card"}.vcf`}
              className="ink-signal-btn-primary"
            >
              {t("actions.saveContact")}
            </a>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="ink-signal-btn-secondary"
            >
              {t("actions.share")}
            </button>
          </div>
        ) : null}

        {visibleFields.length > 0 ? (
          <section className="mt-8">
            <h2 className="ink-signal-section-label">{t("sections.contact")}</h2>
            <ul className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
              {visibleFields.map((field) => {
                const Icon = iconByType[field.field_type] ?? User;
                const label = field.field_label || field.field_type;
                return (
                  <li key={field.id}>
                    <button
                      type="button"
                      onClick={() => void handleContactClick(field)}
                      className="flex min-h-12 w-full items-center gap-3 py-3 text-left transition hover:bg-black/[0.02]"
                    >
                      <Icon
                        className="h-5 w-5 shrink-0 text-[color:var(--ink)]"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium text-[color:var(--ink)]">
                          {label}
                        </span>
                        <span className="block truncate text-sm text-[color:var(--ink-muted)]">
                          {field.field_value}
                        </span>
                      </span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-[color:var(--ink-faint)]"
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {sortedLinks.length > 0 ? (
          <section className="mt-7">
            <h2 className="ink-signal-section-label">{t("sections.links")}</h2>
            <ul className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
              {sortedLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={
                      /^https?:\/\//i.test(link.url)
                        ? link.url
                        : `https://${link.url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-12 items-center justify-between gap-3 py-3 text-[15px] font-medium text-[color:var(--ink)] transition hover:text-[color:var(--accent)]"
                  >
                    <span>{link.label}</span>
                    <ExternalLink
                      className="h-4 w-4 shrink-0 text-[color:var(--ink-faint)]"
                      aria-hidden
                    />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {sortedExperiences.length > 0 ? (
          <section className="mt-7">
            <h2 className="ink-signal-section-label">
              {t("sections.experience")}
            </h2>
            <ol className="relative ml-2 space-y-5 border-l-2 border-[color:var(--line)] pl-5">
              {sortedExperiences.map((experience) => (
                <li key={experience.id} className="relative">
                  <span
                    className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[color:var(--accent)]"
                    aria-hidden
                  />
                  <p className="text-[15px] font-medium text-[color:var(--ink)]">
                    {experience.role}
                  </p>
                  <p className="text-sm text-[color:var(--ink-muted)]">
                    {experience.company}
                  </p>
                  <p className="mt-0.5 text-xs text-[color:var(--ink-faint)]">
                    {formatExperienceRange(
                      experience.start_date,
                      experience.end_date,
                      locale,
                      t("experience.present")
                    )}
                  </p>
                  {experience.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-muted)]">
                      {experience.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {!compact ? (
          <footer className="mt-10 text-center text-xs text-[color:var(--ink-faint)]">
            {t("footer.brand")}
          </footer>
        ) : null}
      </div>

      {toast ? <div className="ink-signal-toast">{toast}</div> : null}
    </div>
  );
}
