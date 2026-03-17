export function isBusinessScopedRequest(request: Request) {
  const scopeHeader = request.headers.get("x-cardlink-app-scope");
  if (scopeHeader?.toLowerCase() === "business") {
    return true;
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return false;
  }

  try {
    const refererUrl = new URL(referer);
    return refererUrl.pathname.startsWith("/business");
  } catch {
    return false;
  }
}
