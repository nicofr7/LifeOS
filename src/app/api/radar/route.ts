import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateMonthlyCost, formatCurrency, roundMoney } from "@/lib/utils"

export async function GET() {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.userId
  const now = new Date()
  const sevenDaysFromNow = new Date(now)
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const expenses = await prisma.expense.findMany({
    where: { userId, isArchived: false },
    include: {
      priceHistory: { orderBy: { date: "desc" } },
      preferences: true,
    },
  })

  const alerts: Array<{
    id: string
    type: string
    severity: "high" | "medium" | "low"
    title: string
    description: string
    expenseId: string | null
    expenseName: string
    potentialSaving: number | null
    actionLabel: string
  }> = []

  for (const expense of expenses) {
    const monthlyCost = calculateMonthlyCost(expense.monthlyCost, expense.billingFrequency)
    const annualCost = roundMoney(monthlyCost * 12)

    // Check if marked as "don't use"
    if (expense.usageStatus === "dont_use") {
      alerts.push({
        id: `unused-${expense.id}`,
        type: "unused",
        severity: "high",
        title: `${expense.name} — not in use`,
        description: `You marked this as unused. Cancel it to save.`,
        expenseId: expense.id,
        expenseName: expense.name,
        potentialSaving: annualCost,
        actionLabel: "Review",
      })
    }

    // Check if rarely used
    if (expense.usageStatus === "rarely_used") {
      alerts.push({
        id: `rarely-used-${expense.id}`,
        type: "rarely_used",
        severity: "medium",
        title: `${expense.name} — rarely used`,
        description: `Costs ${formatCurrency(monthlyCost)}/month. Consider if you still need this.`,
        expenseId: expense.id,
        expenseName: expense.name,
        potentialSaving: annualCost,
        actionLabel: "Review",
      })
    }

    // Check for price increases (>10%)
    if (expense.priceHistory.length >= 2) {
      const latest = expense.priceHistory[0]
      const previous = expense.priceHistory[1]
      if (latest && previous && previous.price > 0) {
        const changePercent = ((latest.price - previous.price) / previous.price) * 100
        if (changePercent > 10) {
          alerts.push({
            id: `price-increase-${expense.id}`,
            type: "price_increase",
            severity: "high",
            title: `${expense.name} — price increased`,
            description: `Cost increased by ${Math.round(changePercent)}% (${formatCurrency(previous.price)} → ${formatCurrency(latest.price)})`,
            expenseId: expense.id,
            expenseName: expense.name,
            potentialSaving: roundMoney((latest.price - previous.price) * 12),
            actionLabel: "Review",
          })
        }
      }
    }

    // Check upcoming renewals (within 7 days)
    if (expense.nextBillingDate) {
      const renewalDate = new Date(expense.nextBillingDate)
      if (renewalDate >= now && renewalDate <= sevenDaysFromNow) {
        const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        alerts.push({
          id: `renewal-soon-${expense.id}`,
          type: "renewal_soon",
          severity: "medium",
          title: `${expense.name} — renews in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
          description: `${formatCurrency(monthlyCost)} will be charged on ${renewalDate.toLocaleDateString()}`,
          expenseId: expense.id,
          expenseName: expense.name,
          potentialSaving: null,
          actionLabel: "View",
        })
      }
    }

    // Check for duplicate services in same category
    const sameCategory = expenses.filter(
      (e) => e.id !== expense.id && e.category === expense.category
    )
    if (sameCategory.length > 0 && !alerts.find((a) => a.type === "duplicate" && a.expenseName === expense.name)) {
      const duplicateNames = sameCategory.map((e) => e.name).join(", ")
      const minCost = Math.min(monthlyCost, ...sameCategory.map((e) => calculateMonthlyCost(e.monthlyCost, e.billingFrequency)))
      alerts.push({
        id: `duplicate-${expense.id}`,
        type: "duplicate",
        severity: "low",
        title: `Possible overlap in ${expense.category.replace('_', ' ')}`,
        description: `Multiple services: ${expense.name}, ${duplicateNames}`,
        expenseId: expense.id,
        expenseName: expense.name,
        potentialSaving: roundMoney(minCost * 12),
        actionLabel: "Review",
      })
    }

    // Check if non-essential and expensive
    if (!expense.isEssential && monthlyCost > 30 && expense.usageStatus !== "dont_use") {
      if (!alerts.find((a) => a.id === `expensive-${expense.id}`)) {
        alerts.push({
          id: `expensive-${expense.id}`,
          type: "expensive_non_essential",
          severity: "low",
          title: `${expense.name} — ${formatCurrency(monthlyCost)}/month`,
          description: `Non-essential expense. Is this worth the cost?`,
          expenseId: expense.id,
          expenseName: expense.name,
          potentialSaving: annualCost,
          actionLabel: "Review",
        })
      }
    }
  }

  // Sort by severity (high first) then by potential saving
  const severityOrder = { high: 0, medium: 1, low: 2 }
  alerts.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (sevDiff !== 0) return sevDiff
    return (b.potentialSaving || 0) - (a.potentialSaving || 0)
  })

  return NextResponse.json({ alerts })
}
