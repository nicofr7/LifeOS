import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calculateMonthlyCost, calculatePotentialSavings, roundMoney } from '@/lib/utils'
import { generateMonthlySnapshot, backfillHistoricalSnapshots } from '@/lib/snapshots'

interface SnapshotData {
  year: number
  month: number
  totalMonthly: number
  totalAnnual: number
  expenseCount: number
  potentialSavings: number
  categoryBreakdown: Record<string, number>
  biggestChanges: { name: string; change: number; previousMonthly: number; currentMonthly: number }[]
}

async function getSnapshotData(userId: string, year: number, month: number): Promise<SnapshotData> {
  const existing = await prisma.monthlySnapshot.findUnique({
    where: { userId_year_month: { userId, year, month } },
  })

  if (existing) {
    return {
      year: existing.year,
      month: existing.month,
      totalMonthly: existing.totalMonthly,
      totalAnnual: existing.totalAnnual,
      expenseCount: existing.expenseCount,
      potentialSavings: existing.potentialSavings,
      categoryBreakdown: existing.categoryBreakdown ? JSON.parse(existing.categoryBreakdown) : {},
      biggestChanges: existing.biggestChanges ? JSON.parse(existing.biggestChanges) : [],
    }
  }

  // Generate on-demand if snapshot doesn't exist
  const snapshot = await generateMonthlySnapshot(userId, year, month)
  return {
    year: snapshot.year,
    month: snapshot.month,
    totalMonthly: snapshot.totalMonthly,
    totalAnnual: snapshot.totalAnnual,
    expenseCount: snapshot.expenseCount,
    potentialSavings: snapshot.potentialSavings,
    categoryBreakdown: snapshot.categoryBreakdown ? JSON.parse(snapshot.categoryBreakdown as string) : {},
    biggestChanges: snapshot.biggestChanges ? JSON.parse(snapshot.biggestChanges as string) : [],
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)

    const targetYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const targetMonth = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const includeTrend = searchParams.get('trend') === 'true'

    // Get or generate current month snapshot
    const currentSnapshot = await getSnapshotData(user.userId, targetYear, targetMonth)

    // Get previous month snapshot for comparison
    let prevYear = targetYear
    let prevMonth = targetMonth - 1
    if (prevMonth < 1) {
      prevMonth = 12
      prevYear -= 1
    }

    let previousSnapshot: SnapshotData | null = null
    const existingPrev = await prisma.monthlySnapshot.findUnique({
      where: { userId_year_month: { userId: user.userId, year: prevYear, month: prevMonth } },
    })
    if (existingPrev) {
      previousSnapshot = {
        year: existingPrev.year,
        month: existingPrev.month,
        totalMonthly: existingPrev.totalMonthly,
        totalAnnual: existingPrev.totalAnnual,
        expenseCount: existingPrev.expenseCount,
        potentialSavings: existingPrev.potentialSavings,
        categoryBreakdown: existingPrev.categoryBreakdown ? JSON.parse(existingPrev.categoryBreakdown) : {},
        biggestChanges: existingPrev.biggestChanges ? JSON.parse(existingPrev.biggestChanges) : [],
      }
    }

    // Calculate changes
    const monthlyChange = previousSnapshot
      ? roundMoney(currentSnapshot.totalMonthly - previousSnapshot.totalMonthly)
      : null
    const annualChange = previousSnapshot
      ? roundMoney(currentSnapshot.totalAnnual - previousSnapshot.totalAnnual)
      : null
    const expenseCountChange = previousSnapshot
      ? currentSnapshot.expenseCount - previousSnapshot.expenseCount
      : null

    // Build action items
    const actionItems: { title: string; description: string; potentialSaving: number; priority: string }[] = []

    const recommendations = await prisma.recommendation.findMany({
      where: { userId: user.userId, isActive: false, isDismissed: false },
      include: { expense: true },
      orderBy: { estimatedSaving: 'desc' },
      take: 5,
    })

    recommendations.forEach(rec => {
      let priority = 'medium'
      if (rec.estimatedSaving > 100) priority = 'high'
      else if (rec.estimatedSaving < 20) priority = 'low'

      actionItems.push({
        title: `${rec.type === 'cancel' ? 'Cancel' : rec.type === 'downgrade' ? 'Downgrade' : 'Review'} ${rec.expense.name}`,
        description: rec.reason,
        potentialSaving: rec.estimatedSaving,
        priority,
      })
    })

    // Add renewal alerts for next 30 days
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const upcomingRenewals = await prisma.expense.findMany({
      where: {
        userId: user.userId,
        isArchived: false,
        nextBillingDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      orderBy: { nextBillingDate: 'asc' },
      take: 5,
    })

    upcomingRenewals.forEach(expense => {
      const daysUntil = Math.ceil(
        (new Date(expense.nextBillingDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      actionItems.push({
        title: `${expense.name} renews in ${daysUntil} days`,
        description: `${roundMoney(calculateMonthlyCost(expense.monthlyCost, expense.billingFrequency))} will be charged. Review before renewal.`,
        potentialSaving: 0,
        priority: daysUntil <= 7 ? 'high' : 'medium',
      })
    })

    actionItems.sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
      const priorityDiff = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
      if (priorityDiff !== 0) return priorityDiff
      return b.potentialSaving - a.potentialSaving
    })

    // Get savings goals progress
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    })

    const goalProgress = goals.map(g => ({
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      percentage: g.targetAmount > 0 ? roundMoney((g.currentAmount / g.targetAmount) * 100) : 0,
    }))

    const response: any = {
      currentMonth: currentSnapshot,
      previousMonth: previousSnapshot,
      comparison: {
        monthlyChange,
        annualChange,
        expenseCountChange,
      },
      actionItems: actionItems.slice(0, 10),
      goalProgress,
    }

    // Include trend data if requested
    if (includeTrend) {
      const snapshots = await prisma.monthlySnapshot.findMany({
        where: { userId: user.userId },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      })

      response.trend = snapshots.map(s => ({
        year: s.year,
        month: s.month,
        totalMonthly: s.totalMonthly,
        totalAnnual: s.totalAnnual,
        expenseCount: s.expenseCount,
        potentialSavings: s.potentialSavings,
      }))
    }

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST endpoint to refresh snapshots and backfill historical data
export async function POST() {
  try {
    const user = await requireAuth()

    // Ensure current month snapshot exists
    const now = new Date()
    await generateMonthlySnapshot(user.userId, now.getFullYear(), now.getMonth() + 1)

    // Backfill historical snapshots
    const allSnapshots = await backfillHistoricalSnapshots(user.userId)

    return NextResponse.json({
      success: true,
      snapshotCount: allSnapshots.length,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
