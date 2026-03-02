// Shared types for card templates

import type { TemplateId } from "@/src/lib/templates";

export type TemplateRendererProps = {
  template: TemplateId;
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
  cardFields: any[];
  cardLinks: any[];
  cardExperiences: any[];
  ownerId: string;
  viewerId: string | null;
  viewerPlan: any;
};
