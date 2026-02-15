// Card Template definitions

export type TemplateId = 
  | "classic-business"
  | "minimalist"
  | "modern-tech"
  | "creative-agency"
  | "medical-professional"
  | "real-estate"
  | "fashion-beauty"
  | "financial-services"
  | "restaurant-food"
  | "artist-portfolio";

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
  // Free Templates
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
    id: "minimalist",
    name: "Minimalist",
    description: "Clean and simple design with modern aesthetics",
    category: "General",
    isPremium: false,
    defaultPattern: "gradient-2",
    defaultColor: "#64748b", // Slate
  },
  {
    id: "modern-tech",
    name: "Modern Tech",
    description: "Contemporary design for tech professionals",
    category: "Technology",
    isPremium: false,
    defaultPattern: "pattern-grid",
    defaultColor: "#6366f1", // Indigo
  },
  
  // Premium Templates
  {
    id: "creative-agency",
    name: "Creative Agency",
    description: "Bold and vibrant for creative professionals",
    category: "Creative",
    isPremium: true,
    defaultPattern: "gradient-5",
    defaultColor: "#a855f7", // Purple
  },
  {
    id: "medical-professional",
    name: "Medical Professional",
    description: "Clean and trustworthy for healthcare providers",
    category: "Healthcare",
    isPremium: true,
    defaultPattern: "pattern-waves",
    defaultColor: "#0ea5e9", // Sky blue
  },
  {
    id: "real-estate",
    name: "Real Estate",
    description: "Professional design for property professionals",
    category: "Real Estate",
    isPremium: true,
    defaultPattern: "pattern-topography",
    defaultColor: "#f97316", // Orange
  },
  {
    id: "fashion-beauty",
    name: "Fashion & Beauty",
    description: "Stylish and elegant for fashion industry",
    category: "Fashion",
    isPremium: true,
    defaultPattern: "gradient-3",
    defaultColor: "#ec4899", // Pink
  },
  {
    id: "financial-services",
    name: "Financial Services",
    description: "Professional and corporate for finance sector",
    category: "Finance",
    isPremium: true,
    defaultPattern: "pattern-dots",
    defaultColor: "#111827", // Dark gray
  },
  {
    id: "restaurant-food",
    name: "Restaurant & Food",
    description: "Warm and inviting for food industry",
    category: "Food & Beverage",
    isPremium: true,
    defaultPattern: "gradient-4",
    defaultColor: "#f59e0b", // Amber
  },
  {
    id: "artist-portfolio",
    name: "Artist & Portfolio",
    description: "Creative showcase for artists and designers",
    category: "Arts",
    isPremium: true,
    defaultPattern: "pattern-circles",
    defaultColor: "#14b8a6", // Teal
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
