import { describe, it, expect, vi } from "vitest";
import { rateLimit } from "../rate-limit";

describe("rateLimit", () => {
  it("allows requests within the limit", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 3 });
    const r1 = limiter("user-1");
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter("user-1");
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter("user-1");
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests once limit is exceeded", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    limiter("user-2");
    limiter("user-2");
    const r3 = limiter("user-2");
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    const limiter = rateLimit({ windowMs: 1_000, max: 1 });
    limiter("user-3");
    const blocked = limiter("user-3");
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(1_001);
    const afterReset = limiter("user-3");
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(0);
    vi.useRealTimers();
  });

  it("tracks different identifiers independently", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    const r1 = limiter("user-a");
    expect(r1.allowed).toBe(true);

    const r2 = limiter("user-b");
    expect(r2.allowed).toBe(true);

    const r3 = limiter("user-a");
    expect(r3.allowed).toBe(false);
  });
});
