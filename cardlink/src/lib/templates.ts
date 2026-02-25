// Card Template definitions

export type TemplateId = 
  | "classic-business";

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
