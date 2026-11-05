/**
 * Shared Cardlink namecard shapes for Geekbobo-backend `/api/cardlink`.
 * Field names stay snake_case to match existing Supabase tables.
 */

export type CardVisibility = "public" | "friends" | "hidden";

export type CardField = {
  id: string;
  field_type: string;
  field_label: string | null;
  field_value: string;
  visibility: CardVisibility;
  sort_order: number | null;
};

export type CardLink = {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  sort_order: number | null;
};

export type CardExperience = {
  id: string;
  role: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  sort_order: number | null;
};

export type CardProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

/** Public card payload from GET /api/cardlink/cards/:slug */
export type PublicCard = {
  id: string;
  user_id: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
  bio: string | null;
  slug: string | null;
  background_pattern: string | null;
  background_color: string | null;
  background_image_url: string | null;
  template: string | null;
  card_fields: CardField[] | null;
  card_links: CardLink[] | null;
  card_experiences: CardExperience[] | null;
  profiles: CardProfile | null;
};

/** Editable card from GET/PATCH /api/cardlink/me/card */
export type EditableCard = PublicCard & {
  card_name?: string | null;
  /** Bound NFC chips (read-only helper; never patch nfc_uid via me/card) */
  nfc?: Array<{
    id: string;
    nfc_uid: string | null;
    status: string | null;
    linked_card_id: string | null;
    total_taps: number | null;
    last_tapped_at: string | null;
  }>;
};

export type PatchMyCardBody = {
  full_name?: string | null;
  title?: string | null;
  company?: string | null;
  bio?: string | null;
  card_name?: string | null;
  background_pattern?: string | null;
  background_color?: string | null;
  background_image_url?: string | null;
  template?: string | null;
  avatar_url?: string | null;
  card_fields?: Array<Omit<CardField, "id"> & { id?: string }>;
  card_links?: Array<Omit<CardLink, "id"> & { id?: string }>;
  card_experiences?: Array<Omit<CardExperience, "id"> & { id?: string }>;
};

/** NFC tap result from GET /api/cardlink/nfc/:uid */
export type NfcTapResult = {
  slug: string;
  card?: PublicCard | null;
  /** Optional legacy-compatible action if backend returns it */
  action?:
    | "redirect"
    | "register"
    | "suspended"
    | "deactivated"
    | "expired"
    | "no_card"
    | "error";
};

export type BindNfcBody = {
  uid: string;
};

export type BindNfcResult = {
  uid: string;
  card_id?: string;
  slug?: string | null;
};

export type ApiErrorBody = {
  error: string;
};

export class CardlinkApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, message: string, body: ApiErrorBody | null = null) {
    super(message);
    this.name = "CardlinkApiError";
    this.status = status;
    this.body = body;
  }
}
