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

export const STRIPE_PRICE_ID       = process.env.STRIPE_PRICE_ID       ?? "";
export const STRIPE_WEBHOOK_SECRET  = process.env.STRIPE_WEBHOOK_SECRET  ?? "";
