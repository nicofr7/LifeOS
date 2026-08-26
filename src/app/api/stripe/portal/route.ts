import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { stripeCustomerId: true, plan: true },
    }) as any

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Upgrade to a paid plan first." },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8080"

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId as string,
      return_url: `${baseUrl}/settings`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error("Stripe portal error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create portal session" },
      { status: 500 }
    )
  }
}
