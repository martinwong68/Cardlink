import { notFound } from "next/navigation";

import { createClient } from "@/src/lib/supabase/server";
import PublicCardConnectionSection from "@/components/PublicCardConnectionSection";
import type { ViewerPlan } from "@/src/lib/visibility";

type CardField = {
  id: string;
  field_type: string;
  field_label: string | null;
  field_value: string;
  visibility: "public" | "friends" | "hidden";
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
  card_fields: CardField[] | null;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
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
      case "Twitter/X":
      case "WeChat":
      case "WhatsApp":
      case "XHS":
      case "Other":
      default:
        lines.push(`URL:${field.field_value}`);
        break;
    }
  });

  lines.push("END:VCARD");

  return lines.join("\n");
}

export default async function PublicCardPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerPlan: ViewerPlan = "anonymous";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();
    viewerPlan = profile?.plan === "premium" ? "premium" : "free";
  }

  const { data: card, error } = await supabase
    .from("business_cards")
    .select(
      "id, user_id, full_name, title, company, bio, slug, card_fields(id, field_type, field_label, field_value, visibility, sort_order), profiles(id, full_name, avatar_url)"
    )
    .or(`slug.eq.${params.slug},id.eq.${params.slug}`)
    .order("sort_order", { foreignTable: "card_fields", ascending: true })
    .maybeSingle<CardRecord>();

  if (error || !card) {
    notFound();
  }

  await supabase.from("card_shares").insert({
    card_id: card.id,
    viewed_by_user_id: user?.id ?? null,
    share_method: "link",
  });

  const viewerId = user?.id ?? null;
  const fullName =
    card.full_name || card.profiles?.full_name || "CardLink User";
  const initials = getInitials(fullName);
  const vcard = buildVCard(card);
  const vcardHref = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;

  return (
    <div className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-xl font-semibold text-white">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {fullName}
              </h1>
              <p className="text-sm text-slate-500">
                {card.title || ""}
                {card.title && card.company ? " • " : ""}
                {card.company || ""}
              </p>
            </div>
          </div>

          {card.bio ? (
            <p className="mt-4 text-sm text-slate-600">{card.bio}</p>
          ) : null}
        </div>

        <PublicCardConnectionSection
          ownerId={card.user_id}
          slug={card.slug ?? params.slug}
          viewerId={viewerId}
          viewerPlan={viewerPlan}
          cardFields={card.card_fields ?? []}
          vcardHref={vcardHref}
        />

        <div className="pt-8 text-center text-xs text-slate-400">
          CardLink
        </div>
      </div>
    </div>
  );
}
