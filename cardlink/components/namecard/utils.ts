export type NamecardField = {
  id: string;
  field_type: string;
  field_label: string | null;
  field_value: string;
  visibility: "public" | "friends" | "hidden" | string;
  sort_order: number | null;
};

export type NamecardLink = {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  sort_order: number | null;
};

export type NamecardExperience = {
  id: string;
  role: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  sort_order: number | null;
};

export function getAvatarInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "CL";
  }

  // CJK: take last 1–2 characters
  if (/[\u3400-\u9fff]/.test(trimmed)) {
    return trimmed.slice(-2);
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "");
}

function ensureUrl(value: string, fallbackPrefix = "https://") {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `${fallbackPrefix}${trimmed.replace(/^\/+/, "")}`;
}

export function buildContactHref(fieldType: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  switch (fieldType) {
    case "Email":
      return `mailto:${trimmed}`;
    case "Phone":
      return `tel:${trimmed.replace(/\s+/g, "")}`;
    case "WhatsApp": {
      const digits = trimmed.replace(/[^0-9]/g, "");
      return digits ? `https://wa.me/${digits}` : null;
    }
    case "LinkedIn":
      return ensureUrl(
        trimmed.includes("linkedin.com") ? trimmed : `linkedin.com/in/${normalizeHandle(trimmed)}`
      );
    case "Telegram":
      return ensureUrl(
        trimmed.includes("t.me") ? trimmed : `t.me/${normalizeHandle(trimmed)}`
      );
    case "Instagram":
      return ensureUrl(
        trimmed.includes("instagram.com")
          ? trimmed
          : `instagram.com/${normalizeHandle(trimmed)}`
      );
    case "Twitter":
      return ensureUrl(
        trimmed.includes("x.com") || trimmed.includes("twitter.com")
          ? trimmed
          : `x.com/${normalizeHandle(trimmed)}`
      );
    case "Website":
      return ensureUrl(trimmed);
    case "WeChat":
      return null;
    default:
      return ensureUrl(trimmed);
  }
}

export function formatExperienceDate(
  value: string | null,
  locale: string
): string {
  if (!value) {
    return "";
  }
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(value)) {
    const [year, month] = value.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
    }).format(date);
  }
  return value;
}

export function formatExperienceRange(
  start: string | null,
  end: string | null,
  locale: string,
  presentLabel: string
) {
  const startLabel = formatExperienceDate(start, locale);
  const endLabel = end ? formatExperienceDate(end, locale) : presentLabel;
  if (!startLabel && !endLabel) {
    return "";
  }
  if (!startLabel) {
    return endLabel;
  }
  return `${startLabel} — ${endLabel}`;
}

export function titleLine(title: string | null, company: string | null) {
  return [title, company].filter(Boolean).join(" · ");
}

export function maskNfcUid(uid: string) {
  const cleaned = uid.trim();
  if (cleaned.length <= 4) {
    return `••••${cleaned}`;
  }
  const tail = cleaned.slice(-Math.min(6, cleaned.length));
  return `••••${tail}`;
}
