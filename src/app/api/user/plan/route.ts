import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { plan: true, createdAt: true },
    })

    return NextResponse.json({
      plan: fullUser?.plan || "free",
      memberSince: fullUser?.createdAt,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { plan } = await request.json()

    if (!["free", "pro", "lifetime"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    // In MVP, just update the plan directly
    // In production, this would integrate with Stripe
    await prisma.user.update({
      where: { id: session.userId },
      data: { plan },
    })

    // Log the plan change
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "plan.changed",
        entity: "user",
        entityId: session.userId,
        details: JSON.stringify({ plan }),
      },
    })

    return NextResponse.json({ success: true, plan })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
