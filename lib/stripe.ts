import Stripe from "stripe";

function createStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

// Lazy singleton — only instantiated on first call, not at module load time.
// This prevents Vercel build failures when env vars are absent during static analysis.
let _stripe: Stripe | undefined;
export function getStripe(): Stripe {
  if (!_stripe) _stripe = createStripeClient();
  return _stripe;
}

// Proxy so existing `stripe.xyz` call sites keep working without changes.
export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return Reflect.get(getStripe(), prop);
  },
});

export const STRIPE_PRICE_ID_STARTER         = process.env.STRIPE_PRICE_ID_STARTER         ?? "";
export const STRIPE_PRICE_ID_PRO             = process.env.STRIPE_PRICE_ID_PRO             ?? "";
export const STRIPE_PRICE_ID_PORTFOLIO       = process.env.STRIPE_PRICE_ID_PORTFOLIO       ?? "";
export const STRIPE_PRICE_ID_MARKETING_ADDON = process.env.STRIPE_PRICE_ID_MARKETING_ADDON ?? "";
export const STRIPE_WEBHOOK_SECRET           = process.env.STRIPE_WEBHOOK_SECRET           ?? "";

// Legacy aliases for backwards compat
export const STRIPE_PRICE_ID_CORE           = STRIPE_PRICE_ID_STARTER;
export const STRIPE_PRICE_ID_CORE_MARKETING = STRIPE_PRICE_ID_STARTER;

export const STRIPE_PRICE_IDS: Record<string, string> = {
  starter:         STRIPE_PRICE_ID_STARTER,
  pro:             STRIPE_PRICE_ID_PRO,
  portfolio:       STRIPE_PRICE_ID_PORTFOLIO,
  core:            STRIPE_PRICE_ID_STARTER,
  core_marketing:  STRIPE_PRICE_ID_STARTER,
};
