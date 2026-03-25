/**
 * Cardlink API client — calls the Cardlink app's public REST endpoints.
 * These endpoints require no authentication and are scoped by company_id.
 *
 * All data written through these endpoints (orders, bookings, form submissions)
 * is automatically visible in the Cardlink business dashboard.
 */

const API_BASE = process.env.NEXT_PUBLIC_CARDLINK_API_URL ?? "";
const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID ?? "";

function apiUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, API_BASE);
  url.searchParams.set("company_id", COMPANY_ID);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

// ─── Website ──────────────────────────────────────────────────────

export type SiteSettings = {
  site_title: string | null;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  custom_css: string | null;
  custom_head_html: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
  footer_text: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_og_image: string | null;
};

export type SitePage = {
  id: string;
  slug: string;
  title: string;
  page_type: string;
  content: unknown;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
  show_in_nav: boolean;
};

export type NavItem = {
  id: string;
  label: string;
  url: string | null;
  page_id: string | null;
  parent_id: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
};

export type SiteData = {
  settings: SiteSettings | null;
  pages: SitePage[];
  navigation: NavItem[];
};

/** Fetch full website data (settings, pages, navigation). */
export async function fetchSiteData(): Promise<SiteData> {
  const res = await fetch(apiUrl("/api/public/website"), { next: { revalidate: 60 } });
  if (!res.ok) return { settings: null, pages: [], navigation: [] };
  return res.json();
}

/** Fetch a single published page by slug. */
export async function fetchPage(slug: string): Promise<SitePage | null> {
  const res = await fetch(apiUrl("/api/public/website", { page: slug }), { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.page ?? null;
}

/** Submit a form (contact, etc.) */
export async function submitForm(data: Record<string, unknown>, formType = "contact", pageId?: string) {
  const res = await fetch(`${API_BASE}/api/public/website`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: COMPANY_ID,
      page_id: pageId,
      form_type: formType,
      data,
    }),
  });
  return res.json();
}

// ─── Store ────────────────────────────────────────────────────────

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  product_type: string;
  images: string[];
  category_id: string | null;
  sku: string | null;
  stock_quantity: number | null;
};

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
};

export type StoreData = {
  store: {
    name: string;
    description: string | null;
    banner_url: string | null;
    theme_color: string | null;
  };
  categories: StoreCategory[];
  products: StoreProduct[];
};

/** Fetch published store products and categories. */
export async function fetchStoreData(): Promise<StoreData | null> {
  const res = await fetch(apiUrl("/api/public/store/products"), { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

export type CheckoutPayload = {
  line_items: Array<{ product_id: string; qty: number }>;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: Record<string, string>;
  shipping_method?: string;
  coupon_code?: string;
  tax_rate?: number;
  shipping_amount?: number;
  payment_method?: string;
  notes?: string;
};

/** Submit a store checkout order. */
export async function submitCheckout(payload: CheckoutPayload) {
  const res = await fetch(`${API_BASE}/api/public/store/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_id: COMPANY_ID, ...payload }),
  });
  return res.json();
}

// ─── Booking ──────────────────────────────────────────────────────

export type BookingService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  category: string | null;
  image_url: string | null;
};

export type BookingSettings = {
  booking_page_title: string | null;
  booking_page_description: string | null;
  require_phone: boolean;
  require_email: boolean;
  timezone: string;
};

export type BookingSlot = {
  start: string;
  end: string;
};

/** Fetch active booking services. */
export async function fetchBookingServices(): Promise<{ services: BookingService[]; settings: BookingSettings }> {
  const res = await fetch(apiUrl("/api/public/booking/services"), { next: { revalidate: 60 } });
  if (!res.ok) return { services: [], settings: { booking_page_title: null, booking_page_description: null, require_phone: false, require_email: true, timezone: "UTC" } };
  return res.json();
}

/** Fetch available time slots for a service on a date. */
export async function fetchBookingSlots(serviceId: string, date: string): Promise<{ slots: BookingSlot[]; service_duration_minutes?: number }> {
  const res = await fetch(apiUrl("/api/public/booking/slots", { service_id: serviceId, date }), { cache: "no-store" });
  if (!res.ok) return { slots: [] };
  return res.json();
}

/** Create a booking appointment. */
export async function createBooking(payload: {
  service_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  date: string;
  start_time: string;
  notes?: string;
}) {
  const res = await fetch(`${API_BASE}/api/public/booking/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_id: COMPANY_ID, ...payload }),
  });
  return res.json();
}
