import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateMonthlyCost } from "@/lib/utils"

interface Change {
  expenseId: string
  expenseName: string
  category: string
  currentMonthly: number
  potentialSaving: number
  action: string
  reason: string
  difficulty: "easy" | "medium" | "hard"
  usageStatus: string
}

interface Plan {
  changes: Change[]
  totalMonthlySaving: number
  totalAnnualSaving: number
  targetMonthly: number
  targetMet: boolean
  disruptionLevel: string
  remainingBudget: number
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const targetMonthly = parseFloat(searchParams.get("target") || "100")

  if (isNaN(targetMonthly) || targetMonthly <= 0) {
    return NextResponse.json({ error: "Invalid target amount" }, { status: 400 })
  }

  const userId = session.userId

  const expenses = await prisma.expense.findMany({
    where: { userId, isArchived: false },
    include: {
      preferences: true,
    },
  })

  // Generate potential changes for each expense
  const potentialChanges: Change[] = []

  for (const expense of expenses) {
    const currentMonthly = calculateMonthlyCost(expense.monthlyCost, expense.billingFrequency)

    // Skip if already dismissed
    const preference = expense.preferences[0]
    if (preference?.preference === "dont_suggest_again") continue

    // === HIGHEST IMPACT: Cancel unused ===
    if (expense.usageStatus === "dont_use") {
      potentialChanges.push({
        expenseId: expense.id,
        expenseName: expense.name,
        category: expense.category,
        currentMonthly,
        potentialSaving: currentMonthly,
        action: "cancel",
        reason: `You marked "${expense.name}" as unused. Cancel it to save 100%.`,
        difficulty: "easy", // If user doesn't use it, canceling is easy regardless of provider
        usageStatus: expense.usageStatus,
      })
    }

    // === MEDIUM IMPACT: Cancel rarely used ===
    if (expense.usageStatus === "rarely_used") {
      potentialChanges.push({
        expenseId: expense.id,
        expenseName: expense.name,
        category: expense.category,
        currentMonthly,
        potentialSaving: currentMonthly,
        action: "cancel",
        reason: `You rarely use "${expense.name}". Cancel to save fully.`,
        difficulty: "easy", // User rarely uses it, so canceling is easy
        usageStatus: expense.usageStatus,
      })

      // Downgrade option for rarely used
      potentialChanges.push({
        expenseId: expense.id,
        expenseName: `${expense.name} (downgrade)`,
        category: expense.category,
        currentMonthly,
        potentialSaving: currentMonthly * 0.5,
        action: "downgrade",
        reason: `Downgrade "${expense.name}" to a cheaper plan.`,
        difficulty: "easy",
        usageStatus: expense.usageStatus,
      })
    }

    // === LOWER IMPACT: Change billing frequency for all ===
    // Estimate switching to annual billing saves ~15-20%
    const annualSaving = currentMonthly * 0.18 * 12
    potentialChanges.push({
      expenseId: expense.id,
      expenseName: expense.name,
      category: expense.category,
      currentMonthly,
      potentialSaving: currentMonthly * 0.18,
      action: "change_billing",
      reason: `Switch "${expense.name}" to annual billing to save ~18%.`,
      difficulty: "easy",
      usageStatus: expense.usageStatus,
    })

    // === LOWER IMPACT: Negotiate price (for active, non-essential) ===
    if (expense.usageStatus === "active" && !expense.isEssential) {
      potentialChanges.push({
        expenseId: expense.id,
        expenseName: expense.name,
        category: expense.category,
        currentMonthly,
        potentialSaving: currentMonthly * 0.2,
        action: "negotiate",
        reason: `Call to negotiate a lower price for "${expense.name}".`,
        difficulty: "medium",
        usageStatus: expense.usageStatus,
      })
    }

    // === LOWEST IMPACT: Downgrade active non-essential ===
    if (expense.usageStatus === "active" && !expense.isEssential) {
      potentialChanges.push({
        expenseId: expense.id,
        expenseName: `${expense.name} (downgrade)`,
        category: expense.category,
        currentMonthly,
        potentialSaving: currentMonthly * 0.4,
        action: "downgrade",
        reason: `Downgrade "${expense.name}" to a cheaper plan.`,
        difficulty: "easy",
        usageStatus: expense.usageStatus,
      })
    }
  }

  // === DUPLICATE DETECTION ===
  const categoryMap = new Map<string, typeof expenses>()
  for (const expense of expenses) {
    const existing = categoryMap.get(expense.category) || []
    existing.push(expense)
    categoryMap.set(expense.category, existing)
  }

  for (const [category, categoryExpenses] of categoryMap) {
    if (categoryExpenses.length > 1) {
      // Find the most expensive one to remove
      const sorted = categoryExpenses.sort(
        (a, b) =>
          calculateMonthlyCost(b.monthlyCost, b.billingFrequency) -
          calculateMonthlyCost(a.monthlyCost, b.billingFrequency)
      )
      const mostExpensive = sorted[0]
      if (mostExpensive) {
        const expensiveMonthly = calculateMonthlyCost(mostExpensive.monthlyCost, mostExpensive.billingFrequency)
        potentialChanges.push({
          expenseId: mostExpensive.id,
          expenseName: mostExpensive.name,
          category: mostExpensive.category,
          currentMonthly: expensiveMonthly,
          potentialSaving: expensiveMonthly,
          action: "remove_duplicate",
          reason: `You have ${categoryExpenses.length} services in ${category}. Keep the best one.`,
          difficulty: "medium",
          usageStatus: mostExpensive.usageStatus,
        })
      }
    }
  }

  // Sort by disruption: easy first, then medium, then hard
  // Within same difficulty, prefer higher savings
  const difficultyOrder = { easy: 0, medium: 1, hard: 2 }
  potentialChanges.sort((a, b) => {
    const diffA = difficultyOrder[a.difficulty]
    const diffB = difficultyOrder[b.difficulty]
    if (diffA !== diffB) return diffA - diffB
    return b.potentialSaving - a.potentialSaving
  })

  // Greedy algorithm: pick changes until target is met
  // Track which expenses we've already modified
  const plan: Plan = {
    changes: [],
    totalMonthlySaving: 0,
    totalAnnualSaving: 0,
    targetMonthly,
    targetMet: false,
    disruptionLevel: "none",
    remainingBudget: targetMonthly,
  }

  const usedExpenseActions = new Set<string>()

  for (const change of potentialChanges) {
    // Create a unique key for this expense+action combo
    const key = `${change.expenseId}:${change.action}`

    // Skip if we already have this exact action for this expense
    if (usedExpenseActions.has(key)) continue

    // If we already have a cancel for this expense, skip other actions
    if (usedExpenseActions.has(`${change.expenseId}:cancel`)) continue

    // For cancel actions, skip if we already have any action for this expense
    if (change.action === "cancel") {
      const hasAnyAction = [...usedExpenseActions].some((k) =>
        k.startsWith(change.expenseId + ":")
      )
      if (hasAnyAction) continue
    }

    if (plan.totalMonthlySaving >= targetMonthly) break

    plan.changes.push(change)
    plan.totalMonthlySaving += change.potentialSaving
    plan.totalAnnualSaving += change.potentialSaving * 12
    plan.remainingBudget = Math.max(0, targetMonthly - plan.totalMonthlySaving)

    usedExpenseActions.add(key)
  }

  plan.targetMet = plan.totalMonthlySaving >= targetMonthly

  // Determine disruption level
  const hasHard = plan.changes.some((c) => c.difficulty === "hard")
  const hasMedium = plan.changes.some((c) => c.difficulty === "medium")
  if (hasHard) plan.disruptionLevel = "significant"
  else if (hasMedium) plan.disruptionLevel = "moderate"
  else if (plan.changes.length > 0) plan.disruptionLevel = "minimal"
  else plan.disruptionLevel = "none"

  return NextResponse.json({ plan })
}
