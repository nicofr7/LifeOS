import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getExpenseLimit, getGoalLimit } from "@/lib/plan-gate"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { plan: true },
    })

    const plan = (user?.plan || "free") as "free" | "pro" | "lifetime"

    const expenseCount = await prisma.expense.count({
      where: { userId: session.userId, isArchived: false },
    })

    const goalCount = await prisma.savingsGoal.count({
      where: { userId: session.userId, isCompleted: false },
    })

    const expenseLimit = getExpenseLimit(plan)
    const goalLimit = getGoalLimit(plan)

    return NextResponse.json({
      plan,
      expenses: {
        used: expenseCount,
        limit: expenseLimit,
        atLimit: expenseCount >= expenseLimit,
        nearLimit: plan === "free" && expenseCount >= expenseLimit - 2,
      },
      goals: {
        used: goalCount,
        limit: goalLimit,
        atLimit: goalCount >= goalLimit,
        nearLimit: plan === "free" && goalCount >= goalLimit,
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
