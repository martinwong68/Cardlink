import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/src/lib/supabase/server";
import { getPublicCardBySlug } from "@/src/lib/cardlink-api";
import type { PublicCard } from "@/src/lib/cardlink-api";
import { resolveEffectiveViewerPlan, type ViewerPlan } from "@/src/lib/visibility";
import PublicCardView from "@/components/PublicCardView";
import type { TemplateId } from "@/src/lib/templates";

function escapeVCardValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function normalizePhone(value: string) {
  return value.trim().replace(/[^0-9+()\-\s]/g, "");
}

function normalizeEmail(value: string) {
  return value.trim();
}

function ensureUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "");
}

function buildProfileUrl(fieldType: string, rawValue: string) {
  const value = rawValue.trim();
  if (!value) {
    return "";
  }

  switch (fieldType) {
    case "LinkedIn":
      return ensureUrl(value.includes("linkedin.com") ? value : `linkedin.com/in/${normalizeHandle(value)}`);
    case "Twitter":
      return ensureUrl(value.includes("x.com") || value.includes("twitter.com") ? value : `x.com/${normalizeHandle(value)}`);
    case "Instagram":
      return ensureUrl(value.includes("instagram.com") ? value : `instagram.com/${normalizeHandle(value)}`);
    case "Telegram":
      return ensureUrl(value.includes("t.me") ? value : `t.me/${normalizeHandle(value)}`);
    case "WhatsApp": {
      const digits = value.replace(/[^0-9]/g, "");
      return digits ? `https://wa.me/${digits}` : "";
    }
    default:
      return ensureUrl(value);
  }
}

function buildVCard(card: PublicCard, resolvedFullName: string) {
  const nameParts = resolvedFullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0] ?? "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(resolvedFullName)}`,
    `N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`,
  ];

  if (card.title) {
    lines.push(`TITLE:${escapeVCardValue(card.title)}`);
  }
  if (card.company) {
    lines.push(`ORG:${escapeVCardValue(card.company)}`);
  }
  if (card.bio) {
    lines.push(`NOTE:${escapeVCardValue(card.bio)}`);
  }

  let urlItemIndex = 1;

  (card.card_fields ?? []).forEach((field) => {
    if (field.visibility !== "public") {
      return;
    }

    switch (field.field_type) {
      case "Phone": {
        const phone = normalizePhone(field.field_value);
        if (phone) {
          lines.push(`TEL;TYPE=CELL:${phone}`);
        }
        break;
      }
      case "Email": {
        const email = normalizeEmail(field.field_value);
        if (email) {
          lines.push(`EMAIL:${escapeVCardValue(email)}`);
        }
        break;
      }
      case "Website": {
        const website = ensureUrl(field.field_value);
        if (website) {
          lines.push(`item${urlItemIndex}.URL:${escapeVCardValue(website)}`);
          lines.push(`item${urlItemIndex}.X-ABLabel:${escapeVCardValue(field.field_label || "Website")}`);
          urlItemIndex += 1;
        }
        break;
      }
      case "LinkedIn":
      case "Twitter":
      case "WeChat":
      case "WhatsApp":
      case "Telegram":
      case "Instagram":
      default: {
        const url = buildProfileUrl(field.field_type, field.field_value);
        if (url) {
          lines.push(`item${urlItemIndex}.URL:${escapeVCardValue(url)}`);
          lines.push(
            `item${urlItemIndex}.X-ABLabel:${escapeVCardValue(field.field_label || field.field_type)}`
          );
          urlItemIndex += 1;
        }
        break;
      }
    }
  });

  lines.push("END:VCARD");

  return lines.join("\n");
}

function normalizeTemplateId(template: string | null): TemplateId {
  if (template === "fullscreen-hero-tabs") {
    return "fullscreen-hero-tabs";
  }
  if (template === "minimal-editorial") {
    return "minimal-editorial";
  }
  if (template === "profile-community") {
    return "profile-community";
  }
  return "classic-business";
}

export default async function PublicCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const t = await getTranslations("publicCard");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerPlan: ViewerPlan = "anonymous";
  if (user?.id) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("plan, premium_until")
      .eq("id", user.id)
      .maybeSingle();
    viewerPlan = resolveEffectiveViewerPlan(profileData);
  }

  // Card payload comes from Geekbobo-backend — not direct business_cards reads.
  const card = await getPublicCardBySlug(slug);

  if (!card) {
    console.error("Public card lookup failed via cardlink API", { slug });
    notFound();
  }

  const fullName =
    card.full_name || card.profiles?.full_name || t("defaultUser");
  const vcard = buildVCard(card, fullName);
  const vcardHref = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;

  return (
    <PublicCardView
      fullName={fullName}
      title={card.title}
      company={card.company}
      bio={card.bio}
      slug={card.slug ?? slug}
      avatarUrl={card.profiles?.avatar_url ?? null}
      backgroundPattern={card.background_pattern}
      backgroundColor={card.background_color}
      backgroundImageUrl={card.background_image_url}
      vcardHref={vcardHref}
      cardFields={card.card_fields ?? []}
      cardLinks={card.card_links ?? []}
      cardExperiences={card.card_experiences ?? []}
      ownerId={card.user_id}
      viewerId={user?.id ?? null}
      viewerPlan={viewerPlan}
      template={normalizeTemplateId(card.template)}
    />
  );
}
