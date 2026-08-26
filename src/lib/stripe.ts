import Stripe from "stripe"
import { prisma } from "./prisma"

// Server-side Stripe instance — lazy-initialized to avoid build-time errors when key is missing
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
    _stripe = new Stripe(key, {
      apiVersion: "2026-07-29.dahlia",
      typescript: true,
    })
  }
  return _stripe
}

// Backwards-compatible export
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop]
  },
})

/**
 * Price IDs — set these in .env.local after creating products in Stripe Dashboard.
 *
 * Create products/prices in Stripe:
 *   1. Pro Monthly: recurring $4.99/mo
 *   2. Lifetime: one-time $79
 *
 * Then set the env vars:
 *   STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
 *   STRIPE_LIFETIME_PRICE_ID=price_xxx
 */
export function getProMonthlyPriceId(): string {
  return process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_pro_monthly_placeholder"
}

export function getLifetimePriceId(): string {
  return process.env.STRIPE_LIFETIME_PRICE_ID || "price_lifetime_placeholder"
}

/**
 * Get or create a Stripe customer for a user.
 * Attaches the user's email and name to the Stripe customer.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name: string | null
): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId!
  }

  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { userId },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id } as any,
  })

  return customer.id
}

/**
 * Determine plan from a Stripe price ID.
 */
export function planFromPriceId(priceId: string): "pro" | "lifetime" | null {
  if (priceId === getProMonthlyPriceId()) return "pro"
  if (priceId === getLifetimePriceId()) return "lifetime"
  return null
}

/**
 * Update the user's plan in the database.
 */
export async function setUserPlan(
  userId: string,
  plan: string,
  stripeSubscriptionId?: string | null,
  stripePriceId?: string | null,
  planEndedAt?: Date | null
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      stripeSubscriptionId: stripeSubscriptionId || null,
      stripePriceId: stripePriceId || null,
      planEndedAt: planEndedAt || null,
    } as any,
  })

  // Log the audit trail
  await prisma.auditLog.create({
    data: {
      userId,
      action: "plan_changed",
      entity: "user",
      details: JSON.stringify({ plan, stripeSubscriptionId, stripePriceId }),
    },
  })
}

/**
 * Construct and verify a Stripe webhook event.
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ""
  )
}

/**
 * Check if a user can manage billing (has a Stripe customer or active subscription).
 */
export function canManageBilling(user: {
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  plan?: string | null
}): boolean {
  return !!(user.stripeCustomerId || user.stripeSubscriptionId || (user.plan && user.plan !== "free"))
}
