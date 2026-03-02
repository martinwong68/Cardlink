// Card Template definitions

export type TemplateId = 
  | "classic-business"
  | "profile-community"
  | "minimal-editorial"
  | "fullscreen-hero-tabs";

export type CardTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  category: string;
  isPremium: boolean;
  thumbnail?: string;
  defaultPattern: string;
  defaultColor: string;
};

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "classic-business",
    name: "Classic Business",
    description: "Traditional corporate style, perfect for professionals",
    category: "Business",
    isPremium: false,
    defaultPattern: "gradient-1",
    defaultColor: "#1e40af", // Blue
  },
  {
    id: "profile-community",
    name: "Profile Community",
    description: "Modern profile card layout optimized for social/community style",
    category: "Profile",
    isPremium: false,
    defaultPattern: "gradient-2",
    defaultColor: "#7c3aed", // Purple
  },
  {
    id: "minimal-editorial",
    name: "Minimal Editorial",
    description: "Editorial-style profile layout with icon-first sections",
    category: "Profile",
    isPremium: false,
    defaultPattern: "gradient-3",
    defaultColor: "#0ea5e9", // Sky
  },
  {
    id: "fullscreen-hero-tabs",
    name: "Aurora Hero Tabs",
    description: "Aurora-style hero with tabbed info, contacts, links, and experience",
    category: "Profile",
    isPremium: false,
    defaultPattern: "gradient-4",
    defaultColor: "#2563eb", // Blue
  },
];

export function getTemplate(id: TemplateId): CardTemplate | undefined {
  return CARD_TEMPLATES.find(t => t.id === id);
}

export function getFreeTemplates(): CardTemplate[] {
  return CARD_TEMPLATES.filter(t => !t.isPremium);
}

export function getPremiumTemplates(): CardTemplate[] {
  return CARD_TEMPLATES.filter(t => t.isPremium);
}

export function getAvailableTemplates(isPremiumUser: boolean): CardTemplate[] {
  return isPremiumUser ? CARD_TEMPLATES : getFreeTemplates();
}
