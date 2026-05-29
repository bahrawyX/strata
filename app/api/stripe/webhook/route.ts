import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { subscription } from "@/lib/schema";
import {
  getStripe,
  getStripeWebhookSecret,
  isStripeConfigured,
} from "@/lib/stripe";

// Stripe needs the raw body to verify the signature. Disable Next's
// automatic body parsing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook handler. Verifies the HMAC signature, then updates the
 * `subscription` row for the affected customer based on the event type.
 *
 * Wire-up at the Stripe dashboard:
 *   1. Dashboard → Developers → Webhooks → "Add endpoint"
 *   2. URL: https://<your-prod-domain>/api/stripe/webhook
 *   3. Events: checkout.session.completed,
 *              customer.subscription.created,
 *              customer.subscription.updated,
 *              customer.subscription.deleted
 *   4. Copy the signing secret into STRIPE_WEBHOOK_SECRET on Vercel.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }
  const stripe = getStripe();
  const secret = getStripeWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Webhook secret missing" },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.strataUserId;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (userId && customerId) {
          await db
            .insert(subscription)
            .values({
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId ?? null,
              plan: subscriptionId ? "pro" : "free",
              status: subscriptionId ? "active" : null,
            })
            .onConflictDoUpdate({
              target: subscription.userId,
              set: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId ?? null,
                plan: subscriptionId ? "pro" : "free",
                status: subscriptionId ? "active" : null,
                updatedAt: new Date(),
              },
            });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const isActive =
          sub.status === "active" || sub.status === "trialing";
        const periodEnd: Date | null =
          "current_period_end" in sub &&
          typeof (sub as { current_period_end?: unknown }).current_period_end ===
            "number"
            ? new Date(
                (sub as { current_period_end: number }).current_period_end *
                  1000
              )
            : null;

        // The customer ID is our reliable join key.
        await db
          .update(subscription)
          .set({
            stripeSubscriptionId: sub.id,
            plan: isActive ? "pro" : "free",
            status: sub.status,
            currentPeriodEnd: periodEnd,
            updatedAt: new Date(),
          })
          .where(eq(subscription.stripeCustomerId, customerId));
        break;
      }

      default:
        // Many events are safe to ignore — log and 200 so Stripe doesn't
        // retry indefinitely.
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook handler failed for ${event.type}`, err);
    // 500 makes Stripe retry, which is what we want for transient DB errors.
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
