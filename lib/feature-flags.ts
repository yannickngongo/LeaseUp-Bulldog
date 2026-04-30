// Feature flags read from env vars.
// Use NEXT_PUBLIC_* prefix so flags are accessible in both server and client.

export type MarketingAddonStatus = "coming_soon" | "live";

export function getMarketingAddonStatus(): MarketingAddonStatus {
  return process.env.NEXT_PUBLIC_MARKETING_ADDON_STATUS === "live"
    ? "live"
    : "coming_soon";
}

export function isMarketingAddonLive(): boolean {
  return getMarketingAddonStatus() === "live";
}
