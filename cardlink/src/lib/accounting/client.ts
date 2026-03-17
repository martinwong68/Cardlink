const SCOPE_HEADERS: HeadersInit = {
  "x-cardlink-app-scope": "business",
};

const WRITE_HEADERS: HeadersInit = {
  "content-type": "application/json",
  "x-cardlink-app-scope": "business",
};

type ApiErrorBody = {
  error?: string;
};

export async function accountingGet<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: SCOPE_HEADERS,
    cache: "no-store",
  });
  const body = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    throw new Error(body.error ?? `GET ${url} failed`);
  }
  return body as T;
}

export async function accountingPost<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: WRITE_HEADERS,
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    throw new Error(body.error ?? `POST ${url} failed`);
  }
  return body as T;
}

export async function accountingPatch<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: WRITE_HEADERS,
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    throw new Error(body.error ?? `PATCH ${url} failed`);
  }
  return body as T;
}

export async function accountingUpload<T>(url: string, payload: FormData): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-cardlink-app-scope": "business",
    },
    body: payload,
  });
  const body = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    throw new Error(body.error ?? `UPLOAD ${url} failed`);
  }
  return body as T;
}
