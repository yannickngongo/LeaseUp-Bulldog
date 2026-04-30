// tests/feature-flags.test.ts
// Verifies the marketing add-on launch flag works correctly.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("isMarketingAddonLive", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.NEXT_PUBLIC_MARKETING_ADDON_STATUS;
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MARKETING_ADDON_STATUS = original;
  });

  it("returns false when env var is unset", async () => {
    delete process.env.NEXT_PUBLIC_MARKETING_ADDON_STATUS;
    const { isMarketingAddonLive } = await import("@/lib/feature-flags");
    expect(isMarketingAddonLive()).toBe(false);
  });

  it("returns false when env var is 'coming_soon'", async () => {
    process.env.NEXT_PUBLIC_MARKETING_ADDON_STATUS = "coming_soon";
    const { isMarketingAddonLive } = await import("@/lib/feature-flags");
    expect(isMarketingAddonLive()).toBe(false);
  });

  it("returns true only when env var is exactly 'live'", async () => {
    process.env.NEXT_PUBLIC_MARKETING_ADDON_STATUS = "live";
    const { isMarketingAddonLive } = await import("@/lib/feature-flags");
    expect(isMarketingAddonLive()).toBe(true);
  });

  it("returns false for any non-'live' value (defensive)", async () => {
    process.env.NEXT_PUBLIC_MARKETING_ADDON_STATUS = "yes";
    const { isMarketingAddonLive } = await import("@/lib/feature-flags");
    expect(isMarketingAddonLive()).toBe(false);
  });
});
