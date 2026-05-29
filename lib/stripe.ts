import Stripe from "stripe";

/**
 * Lazy Stripe client. Tries to read STRIPE_SECRET_KEY on first call so the
 * rest of the codebase imports/typechecks cleanly even when the key isn't
 * set (e.g. local dev without billing wired). Server actions that need the
 * client should check getStripe() before use and gracefully handle null.
 */
let cached: Stripe | null = null;
let triedInit = false;

export function getStripe(): Stripe | null {
  if (triedInit) return cached;
  triedInit = true;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached = new Stripe(key, {
    // Use the SDK's pinned API version (TS infers from constructor).
    typescript: true,
  });
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripePriceIdPro(): string | null {
  return process.env.STRIPE_PRICE_ID_PRO || null;
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}
