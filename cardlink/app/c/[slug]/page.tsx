import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/src/lib/supabase/server";
import type { ViewerPlan } from "@/src/lib/visibility";
import PublicCardView from "@/components/PublicCardView";

type CardField = {
  id: string;
  field_type: string;
  field_label: string | null;
  field_value: string;
  visibility: "public" | "friends" | "hidden";
  sort_order: number | null;
};

type CardLink = {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  sort_order: number | null;
};

type CardExperience = {
  id: string;
  role: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  sort_order: number | null;
};

type CardRecord = {
  id: string;
  user_id: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
  bio: string | null;
  slug: string | null;
  background_pattern: string | null;
  background_color: string | null;
  template: string | null;
  card_fields: CardField[] | null;
  card_links: CardLink[] | null;
  card_experiences: CardExperience[] | null;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
};


function buildVCard(card: CardRecord) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${card.full_name ?? ""}`,
  ];

  if (card.title) {
    lines.push(`TITLE:${card.title}`);
  }
  if (card.company) {
    lines.push(`ORG:${card.company}`);
  }
  if (card.bio) {
    lines.push(`NOTE:${card.bio}`);
  }

  (card.card_fields ?? []).forEach((field) => {
    if (field.visibility !== "public") {
      return;
    }

    switch (field.field_type) {
      case "Phone":
        lines.push(`TEL;TYPE=cell:${field.field_value}`);
        break;
      case "Email":
        lines.push(`EMAIL:${field.field_value}`);
        break;
      case "Website":
        lines.push(`URL:${field.field_value}`);
        break;
      case "LinkedIn":
      case "Twitter":
      case "WeChat":
      case "WhatsApp":
      case "Telegram":
      case "Instagram":
      default:
        lines.push(`URL:${field.field_value}`);
        break;
    }
  });

  lines.push("END:VCARD");

  return lines.join("\n");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
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
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();
    viewerPlan = profileData?.plan === "premium" ? "premium" : "free";
  }

  const { data: cardBySlug, error: slugError } = await supabase
    .from("business_cards")
    .select(
      "id, user_id, full_name, title, company, bio, slug, background_pattern, background_color, template, card_fields(id, field_type, field_label, field_value, visibility, sort_order), card_links(id, label, url, icon, sort_order), card_experiences(id, role, company, start_date, end_date, description, sort_order), profiles(id, full_name, avatar_url)"
    )
    .eq("slug", slug)
    .order("sort_order", { foreignTable: "card_fields", ascending: true })
    .order("sort_order", { foreignTable: "card_links", ascending: true })
    .order("sort_order", { foreignTable: "card_experiences", ascending: true })
    .maybeSingle<CardRecord>();

  let card = cardBySlug ?? null;
  let error = slugError ?? null;

  if (!card && isUuid(slug)) {
    const { data: cardById, error: idError } = await supabase
      .from("business_cards")
      .select(
        "id, user_id, full_name, title, company, bio, slug, background_pattern, background_color, template, card_fields(id, field_type, field_label, field_value, visibility, sort_order), card_links(id, label, url, icon, sort_order), card_experiences(id, role, company, start_date, end_date, description, sort_order), profiles(id, full_name, avatar_url)"
      )
      .eq("id", slug)
      .order("sort_order", { foreignTable: "card_fields", ascending: true })
      .order("sort_order", { foreignTable: "card_links", ascending: true })
      .order("sort_order", { foreignTable: "card_experiences", ascending: true })
      .maybeSingle<CardRecord>();
    card = cardById ?? null;
    error = idError ?? null;
  }

  if (error || !card) {
    console.error("Public card lookup failed", {
      slug,
      slugError: slugError?.message ?? null,
      idError: error?.message ?? null,
      hasCard: Boolean(card),
    });
    notFound();
  }

  await supabase.from("card_shares").insert({
    card_id: card.id,
    viewed_by_user_id: user?.id ?? null,
    share_method: "link",
  });

  const fullName =
    card.full_name || card.profiles?.full_name || t("defaultUser");
  const vcard = buildVCard(card);
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
      vcardHref={vcardHref}
      cardFields={card.card_fields ?? []}
      cardLinks={card.card_links ?? []}
      cardExperiences={card.card_experiences ?? []}
      ownerId={card.user_id}
      viewerId={user?.id ?? null}
      viewerPlan={viewerPlan}
      template={(card.template as any) ?? null}
    />
  );
}
