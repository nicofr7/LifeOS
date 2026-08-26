import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "lifeos-admin-key-2024"

export async function GET(request: NextRequest) {
  try {
    // Verify admin API key
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${ADMIN_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all purchase intents from audit log
    const purchaseIntents = await prisma.auditLog.findMany({
      where: {
        action: "purchase_intent",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            plan: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Get all confirmed purchases
    const confirmedPurchases = await prisma.auditLog.findMany({
      where: {
        action: "purchase_confirmed",
      },
      select: {
        userId: true,
      },
    })

    const confirmedUserIds = new Set(confirmedPurchases.map((p) => p.userId))

    // Separate pending vs confirmed
    const pending = purchaseIntents
      .filter((intent) => !confirmedUserIds.has(intent.userId))
      .map((intent) => {
        const details = intent.details ? JSON.parse(intent.details) : {}
        return {
          id: intent.id,
          userId: intent.userId,
          name: intent.user.name || "Unknown",
          email: intent.user.email,
          plan: details.plan || "pro",
          requestedAt: intent.createdAt,
          currentPlan: intent.user.plan,
        }
      })

    const confirmed = purchaseIntents
      .filter((intent) => confirmedUserIds.has(intent.userId))
      .map((intent) => {
        const details = intent.details ? JSON.parse(intent.details) : {}
        return {
          id: intent.id,
          userId: intent.userId,
          name: intent.user.name || "Unknown",
          email: intent.user.email,
          plan: details.plan || "pro",
          requestedAt: intent.createdAt,
          currentPlan: intent.user.plan,
        }
      })

    return NextResponse.json({
      pending,
      confirmed,
      stats: {
        totalIntents: purchaseIntents.length,
        pendingCount: pending.length,
        confirmedCount: confirmed.length,
      },
    })
  } catch (error: any) {
    console.error("Admin pending error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending purchases" },
      { status: 500 }
    )
  }
}
