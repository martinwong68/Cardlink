import { afterEach, describe, expect, it, vi } from "vitest";

describe("cardlink-api mock mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns demo public card by slug", async () => {
    vi.stubEnv("CARDLINK_API_MOCK", "1");
    const { getPublicCardBySlug } = await import("../client");
    const card = await getPublicCardBySlug("demo");
    expect(card?.slug).toBe("demo");
    expect(card?.full_name).toBe("示範名片");
  });

  it("resolves nfc tap to demo slug", async () => {
    vi.stubEnv("CARDLINK_API_MOCK", "1");
    const { getNfcTap } = await import("../client");
    const tap = await getNfcTap("chip-001");
    expect(tap?.slug).toBe("demo");
  });

  it("rejects nfc_uid on patchMyCard", async () => {
    vi.stubEnv("CARDLINK_API_MOCK", "1");
    const { patchMyCard } = await import("../client");
    const { CardlinkApiError } = await import("../types");
    await expect(
      patchMyCard("token", { nfc_uid: "x" } as never)
    ).rejects.toBeInstanceOf(CardlinkApiError);
  });
});
