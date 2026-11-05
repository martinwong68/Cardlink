/**
 * Geekbobo-backend base URL for Cardlink namecard APIs.
 * Paths are always `/api/cardlink/...` relative to this origin.
 */
export function getCardlinkApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_CARDLINK_API_BASE_URL ??
    process.env.CARDLINK_API_BASE_URL ??
    "";
  return raw.replace(/\/$/, "");
}

export function isCardlinkApiMock(): boolean {
  return (
    process.env.CARDLINK_API_MOCK === "1" ||
    process.env.NEXT_PUBLIC_CARDLINK_API_MOCK === "1"
  );
}

export function requireCardlinkApiBaseUrl(): string {
  const base = getCardlinkApiBaseUrl();
  if (!base && !isCardlinkApiMock()) {
    throw new Error(
      "Missing NEXT_PUBLIC_CARDLINK_API_BASE_URL (Geekbobo-backend origin)"
    );
  }
  return base;
}
