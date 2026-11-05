"use client";

import InkSignalCard from "@/components/namecard/InkSignalCard";
import type { ViewerPlan } from "@/src/lib/visibility";
import type { TemplateId } from "@/src/lib/templates";

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

type PublicCardViewProps = {
  fullName: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  slug: string;
  avatarUrl: string | null;
  backgroundPattern: string | null;
  backgroundColor: string | null;
  backgroundImageUrl: string | null;
  vcardHref: string;
  cardFields: CardField[];
  cardLinks: CardLink[];
  cardExperiences: CardExperience[];
  ownerId: string;
  viewerId: string | null;
  viewerPlan: ViewerPlan;
  template?: TemplateId | null;
};

/**
 * Phase 1 public card — Ink Signal redesign.
 * Templates / community / business modules stay hidden on this surface.
 */
export default function PublicCardView({
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
}: PublicCardViewProps) {
  return (
    <InkSignalCard
      fullName={fullName}
      title={title}
      company={company}
      bio={bio}
      slug={slug}
      avatarUrl={avatarUrl}
      vcardHref={vcardHref}
      cardFields={cardFields}
      cardLinks={cardLinks}
      cardExperiences={cardExperiences}
    />
  );
}
