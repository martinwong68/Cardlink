import { isCardlinkApiMock, requireCardlinkApiBaseUrl } from "./config";
import {
  mockBindNfc,
  mockGetMyCard,
  mockGetNfcTap,
  mockGetPublicCard,
  mockPatchMyCard,
} from "./mock";
import {
  BindNfcBody,
  BindNfcResult,
  CardlinkApiError,
  EditableCard,
  NfcTapResult,
  PatchMyCardBody,
  PublicCard,
  type ApiErrorBody,
} from "./types";

type RequestOptions = {
  method?: "GET" | "PATCH" | "POST";
  token?: string | null;
  body?: unknown;
};

async function parseError(res: Response): Promise<CardlinkApiError> {
  let body: ApiErrorBody | null = null;
  let message = res.statusText || `HTTP ${res.status}`;
  try {
    const json = (await res.json()) as ApiErrorBody;
    body = json;
    if (json?.error) {
      message = json.error;
    }
  } catch {
    // ignore non-JSON error bodies
  }
  return new CardlinkApiError(res.status, message, body);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = requireCardlinkApiBaseUrl();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

/** GET /api/cardlink/cards/:slug — public, no auth */
export async function getPublicCardBySlug(slug: string): Promise<PublicCard | null> {
  if (isCardlinkApiMock()) {
    return mockGetPublicCard(slug);
  }
  try {
    return await request<PublicCard>(
      `/api/cardlink/cards/${encodeURIComponent(slug)}`
    );
  } catch (error) {
    if (error instanceof CardlinkApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** GET /api/cardlink/nfc/:uid — public, no auth */
export async function getNfcTap(uid: string): Promise<NfcTapResult | null> {
  if (isCardlinkApiMock()) {
    return mockGetNfcTap(uid);
  }
  try {
    return await request<NfcTapResult>(
      `/api/cardlink/nfc/${encodeURIComponent(uid)}`
    );
  } catch (error) {
    if (error instanceof CardlinkApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** GET /api/cardlink/me/card — Bearer required */
export async function getMyCard(token: string): Promise<EditableCard | null> {
  if (isCardlinkApiMock()) {
    return mockGetMyCard();
  }
  try {
    return await request<EditableCard>("/api/cardlink/me/card", { token });
  } catch (error) {
    if (error instanceof CardlinkApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** PATCH /api/cardlink/me/card — Bearer required; never send nfc_uid */
export async function patchMyCard(
  token: string,
  body: PatchMyCardBody
): Promise<EditableCard> {
  if ("nfc_uid" in (body as Record<string, unknown>)) {
    throw new CardlinkApiError(400, "nfc_uid cannot be patched via me/card");
  }
  if (isCardlinkApiMock()) {
    return mockPatchMyCard(body);
  }
  return request<EditableCard>("/api/cardlink/me/card", {
    method: "PATCH",
    token,
    body,
  });
}

/** POST /api/cardlink/me/nfc/bind — Bearer required */
export async function bindMyNfc(
  token: string,
  body: BindNfcBody
): Promise<BindNfcResult> {
  if (isCardlinkApiMock()) {
    try {
      return await mockBindNfc(body.uid);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      throw new CardlinkApiError(status, (error as Error).message);
    }
  }
  return request<BindNfcResult>("/api/cardlink/me/nfc/bind", {
    method: "POST",
    token,
    body,
  });
}
