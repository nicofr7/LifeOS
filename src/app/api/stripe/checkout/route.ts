import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  stripe,
  getOrCreateStripeCustomer,
  getProMonthlyPriceId,
  getLifetimePriceId,
} from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { plan } = await request.json()

    if (plan !== "pro" && plan !== "lifetime") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, plan: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      user.name
    )

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8080"

    if (plan === "lifetime") {
      // One-time payment — no subscription
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: getLifetimePriceId(),
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/settings?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing?stripe=cancelled`,
        metadata: {
          userId: user.id,
          plan: "lifetime",
        },
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    // Pro monthly — subscription
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: getProMonthlyPriceId(),
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/settings?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?stripe=cancelled`,
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: "pro",
        },
      },
      metadata: {
        userId: user.id,
        plan: "pro",
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
