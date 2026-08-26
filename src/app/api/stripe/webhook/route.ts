import { NextRequest, NextResponse } from "next/server"
import { constructWebhookEvent, setUserPlan, planFromPriceId } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import type Stripe from "stripe"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(body, signature)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      default:
        // Unhandled event type — just acknowledge
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error(`Webhook handler error for ${event.type}:`, err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

/**
 * Checkout session completed — user just paid.
 * For subscriptions: activate the plan.
 * For one-time (lifetime): activate the plan.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan

  if (!userId || !plan) {
    console.error("checkout.session.completed missing metadata:", session.id)
    return
  }

  if (plan === "lifetime") {
    // One-time payment — activate lifetime immediately
    await setUserPlan(userId, "lifetime", null, null, null)
    console.log(`User ${userId} upgraded to lifetime via checkout`)
    return
  }

  // For subscriptions, the subscription object will handle activation
  // via customer.subscription.updated. But we can also set it here
  // if the subscription is already active.
  if (session.subscription) {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id

    await setUserPlan(userId, "pro", subscriptionId, null, null)
    console.log(`User ${userId} upgraded to pro via checkout: ${subscriptionId}`)
  }
}

/**
 * Subscription updated — plan changed, renewed, or status changed.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId || subscription.items.data[0]?.metadata?.userId

  if (!userId) {
    console.error("customer.subscription.updated missing userId metadata:", subscription.id)
    return
  }

  const priceId = subscription.items.data[0]?.price?.id || null
  const plan = priceId ? planFromPriceId(priceId) : null
  const status = subscription.status

  // Determine the plan based on status
  if (status === "active" || status === "trialing") {
    if (plan) {
      await setUserPlan(userId, plan, subscription.id, priceId, null)
      console.log(`User ${userId} subscription active: ${plan} (${subscription.id})`)
    }
  } else if (status === "past_due" || status === "unpaid") {
    // Keep the plan active but flag for attention
    console.warn(`User ${userId} subscription ${status}: ${subscription.id}`)
  } else if (status === "canceled" || status === "incomplete_expired") {
    // Subscription ended — downgrade to free
    const endDate = (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000)
      : new Date()
    await setUserPlan(userId, "free", null, null, endDate)
    console.log(`User ${userId} subscription ${status}: downgraded to free`)
  }
}

/**
 * Subscription deleted — user cancelled or failed to pay.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId || subscription.items.data[0]?.metadata?.userId

  if (!userId) {
    console.error("customer.subscription.deleted missing userId metadata:", subscription.id)
    return
  }

  // Downgrade to free, keep access until period end
  const currentPeriodEnd = (subscription as any).current_period_end
    ? new Date((subscription as any).current_period_end * 1000)
    : new Date()

  await setUserPlan(userId, "free", null, null, currentPeriodEnd)
  console.log(`User ${userId} subscription deleted: downgraded to free, access until ${currentPeriodEnd.toISOString()}`)
}

/**
 * Invoice payment failed — user's card was declined.
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription
    ? typeof (invoice as any).subscription === "string"
      ? (invoice as any).subscription
      : (invoice as any).subscription?.id
    : null

  if (!subscriptionId) return

  // Find the user by subscription ID
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscriptionId } as any,
    select: { id: true, email: true },
  })

  if (!user) return

  // Create a notification for the user
  await prisma.notification.create({
    data: {
      userId: user.id,
      title: "Payment failed",
      message: "Your last payment for LifeOS Pro was declined. Please update your payment method to keep your Pro features active.",
      type: "warning",
      actionUrl: "/settings",
    },
  })

  console.warn(`Payment failed for user ${user.id} (${user.email})`)
}

/**
 * Invoice payment succeeded — recurring payment went through.
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription
    ? typeof (invoice as any).subscription === "string"
      ? (invoice as any).subscription
      : (invoice as any).subscription?.id
    : null

  if (!subscriptionId) return

  // Find the user and ensure plan is active
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscriptionId } as any,
    select: { id: true, plan: true },
  })

  if (!user || user.plan === "free") {
    // Re-activate if somehow was downgraded
    const sub = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscriptionId } as any,
      select: { id: true, stripePriceId: true },
    })
    if ((sub as any)?.stripePriceId) {
      const plan = planFromPriceId((sub as any).stripePriceId)
      if (plan) {
        await setUserPlan(user!.id, plan, subscriptionId, (sub as any).stripePriceId, null)
      }
    }
  }
}
