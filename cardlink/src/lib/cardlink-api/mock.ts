import type {
  BindNfcResult,
  EditableCard,
  NfcTapResult,
  PatchMyCardBody,
  PublicCard,
} from "./types";

const MOCK_CARD: PublicCard = {
  id: "00000000-0000-4000-8000-000000000001",
  user_id: "00000000-0000-4000-8000-000000000099",
  full_name: "示範名片",
  title: "產品經理",
  company: "Cardlink",
  bio: "這是 mock 公開名片，後端就緒後請關閉 CARDLINK_API_MOCK。",
  slug: "demo",
  background_pattern: "gradient-1",
  background_color: "#0f172a",
  background_image_url: null,
  template: "classic-business",
  card_fields: [
    {
      id: "f1",
      field_type: "Email",
      field_label: "Email",
      field_value: "demo@cardlink.local",
      visibility: "public",
      sort_order: 0,
    },
    {
      id: "f2",
      field_type: "Phone",
      field_label: "電話",
      field_value: "+852 0000 0000",
      visibility: "public",
      sort_order: 1,
    },
  ],
  card_links: [
    {
      id: "l1",
      label: "網站",
      url: "https://example.com",
      icon: null,
      sort_order: 0,
    },
  ],
  card_experiences: [
    {
      id: "e1",
      role: "產品經理",
      company: "Cardlink",
      start_date: "2024-01-01",
      end_date: null,
      description: "電子名片與 NFC",
      sort_order: 0,
    },
  ],
  profiles: {
    id: "00000000-0000-4000-8000-000000000099",
    full_name: "示範名片",
    avatar_url: null,
  },
};

let mockEditable: EditableCard = {
  ...MOCK_CARD,
  card_name: "我的名片",
  nfc: [],
};

export async function mockGetPublicCard(slug: string): Promise<PublicCard | null> {
  if (slug === MOCK_CARD.slug || slug === MOCK_CARD.id) {
    return structuredClone(MOCK_CARD);
  }
  return null;
}

export async function mockGetNfcTap(uid: string): Promise<NfcTapResult | null> {
  if (!uid || uid === "invalid") {
    return null;
  }
  if (uid === "no-card") {
    return { slug: "", action: "no_card" };
  }
  return { slug: MOCK_CARD.slug!, card: structuredClone(MOCK_CARD), action: "redirect" };
}

export async function mockGetMyCard(): Promise<EditableCard | null> {
  return structuredClone(mockEditable);
}

export async function mockPatchMyCard(body: PatchMyCardBody): Promise<EditableCard> {
  mockEditable = {
    ...mockEditable,
    ...body,
    card_fields: (body.card_fields as EditableCard["card_fields"]) ?? mockEditable.card_fields,
    card_links: (body.card_links as EditableCard["card_links"]) ?? mockEditable.card_links,
    card_experiences:
      (body.card_experiences as EditableCard["card_experiences"]) ??
      mockEditable.card_experiences,
  };
  return structuredClone(mockEditable);
}

export async function mockBindNfc(uid: string): Promise<BindNfcResult> {
  if (uid === "taken") {
    const err = new Error("uid already bound") as Error & { status: number };
    err.status = 409;
    throw err;
  }
  return { uid, card_id: mockEditable.id, slug: mockEditable.slug };
}
