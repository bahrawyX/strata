"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscription } from "@/lib/schema";
import {
  getStripe,
  getStripePriceIdPro,
  isStripeConfigured,
} from "@/lib/stripe";
import { getViewer } from "@/lib/viewer";

export type BillingResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Create (or reuse) the user's Stripe customer, open a Checkout Session for
 * the Pro plan, and redirect to it. Demo and anonymous viewers are bounced
 * to /signup — billing requires a real account.
 */
export async function startProCheckout(): Promise<BillingResult> {
  const viewer = await getViewer();
  if (!viewer || viewer.source !== "real") {
    redirect("/signup");
  }
  if (!isStripeConfigured()) {
    return {
      ok: false,
      error:
        "Billing isn't configured yet on the server (STRIPE_SECRET_KEY missing). Try again once a Stripe account is connected.",
    };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: "Stripe client unavailable." };
  }
  const priceId = getStripePriceIdPro();
  if (!priceId) {
    return {
      ok: false,
      error:
        "Pro plan price isn't configured (STRIPE_PRICE_ID_PRO missing).",
    };
  }

  // Look up or create a Stripe customer for this user.
  let customerId: string | null = null;
  try {
    const [row] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, viewer.id))
      .limit(1);
    customerId = row?.stripeCustomerId ?? null;
  } catch (err) {
    console.error("startProCheckout: subscription lookup failed", err);
    return {
      ok: false,
      error:
        "Could not read your subscription. Check the database connection and try again.",
    };
  }

  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: viewer.email,
        name: viewer.name,
        metadata: { strataUserId: viewer.id },
      });
      customerId = customer.id;
      // Upsert a 'free' subscription row to anchor the customer ID.
      await db
        .insert(subscription)
        .values({
          userId: viewer.id,
          stripeCustomerId: customerId,
          plan: "free",
        })
        .onConflictDoUpdate({
          target: subscription.userId,
          set: { stripeCustomerId: customerId, updatedAt: new Date() },
        });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings/billing?checkout=success`,
      cancel_url: `${baseUrl}/settings/billing?checkout=canceled`,
      allow_promotion_codes: true,
      // Surface the user id on the session for the webhook to map back.
      metadata: { strataUserId: viewer.id },
    });

    if (!session.url) {
      return { ok: false, error: "Stripe didn't return a checkout URL." };
    }
    redirect(session.url);
  } catch (err) {
    // redirect() throws — re-throw so Next handles it.
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("startProCheckout failed", err);
    return {
      ok: false,
      error: "Could not start checkout. Try again in a few seconds.",
    };
  }
}

/**
 * Open a Stripe Billing Portal session so the user can manage / cancel
 * their subscription. Requires an existing customer.
 */
export async function openBillingPortal(): Promise<BillingResult> {
  const viewer = await getViewer();
  if (!viewer || viewer.source !== "real") {
    redirect("/login");
  }
  if (!isStripeConfigured()) {
    return {
      ok: false,
      error: "Billing isn't configured on the server.",
    };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: "Stripe client unavailable." };
  }

  let customerId: string | null = null;
  try {
    const [row] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, viewer.id))
      .limit(1);
    customerId = row?.stripeCustomerId ?? null;
  } catch (err) {
    console.error("openBillingPortal: lookup failed", err);
    return { ok: false, error: "Could not read your subscription." };
  }

  if (!customerId) {
    return {
      ok: false,
      error: "No active subscription yet — upgrade first.",
    };
  }

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/settings/billing`,
    });
    redirect(portal.url);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("openBillingPortal failed", err);
    return {
      ok: false,
      error: "Could not open the billing portal.",
    };
  }
}
