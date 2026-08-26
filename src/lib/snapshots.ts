import { prisma } from './prisma'
import { calculateMonthlyCost, calculatePotentialSavings, roundMoney } from './utils'

/**
 * Generate a monthly snapshot for a user for a specific year/month.
 * This captures a point-in-time view of all active expenses.
 * Uses upsert so it's safe to call multiple times.
 */
export async function generateMonthlySnapshot(userId: string, year: number, month: number) {
  const expenses = await prisma.expense.findMany({
    where: { userId, isArchived: false },
    include: {
      priceHistory: {
        orderBy: { date: 'desc' },
        take: 10,
      },
    },
  })

  const totalMonthly = roundMoney(
    expenses.reduce((sum, e) => sum + calculateMonthlyCost(e.monthlyCost, e.billingFrequency), 0)
  )
  const totalAnnual = roundMoney(totalMonthly * 12)
  const expenseCount = expenses.length
  const potentialSavings = calculatePotentialSavings(expenses)

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {}
  expenses.forEach(e => {
    const monthly = calculateMonthlyCost(e.monthlyCost, e.billingFrequency)
    categoryBreakdown[e.category] = roundMoney((categoryBreakdown[e.category] || 0) + monthly)
  })

  // Biggest price changes vs previous snapshot
  let biggestChanges: { name: string; change: number; previousMonthly: number; currentMonthly: number }[] = []

  // Find previous month snapshot
  let prevYear = year
  let prevMonth = month - 1
  if (prevMonth < 1) {
    prevMonth = 12
    prevYear -= 1
  }
  const prevSnapshot = await prisma.monthlySnapshot.findUnique({
    where: { userId_year_month: { userId, year: prevYear, month: prevMonth } },
  })

  if (prevSnapshot) {
    const prevCategories: Record<string, number> = prevSnapshot.categoryBreakdown
      ? JSON.parse(prevSnapshot.categoryBreakdown)
      : {}

    // Compare categories
    const allCategories = new Set([
      ...Object.keys(categoryBreakdown),
      ...Object.keys(prevCategories),
    ])

    // Also compare individual expenses if possible
    expenses.forEach(e => {
      if (e.priceHistory.length >= 2) {
        const current = e.priceHistory[0].price
        const previous = e.priceHistory[1].price
        const currentMonthly = roundMoney(calculateMonthlyCost(current, e.billingFrequency))
        const previousMonthly = roundMoney(calculateMonthlyCost(previous, e.billingFrequency))
        const change = roundMoney(currentMonthly - previousMonthly)
        if (Math.abs(change) > 0.01) {
          biggestChanges.push({
            name: e.name,
            change,
            previousMonthly,
            currentMonthly,
          })
        }
      }
    })
  }

  biggestChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))

  // Upsert the snapshot
  const snapshot = await prisma.monthlySnapshot.upsert({
    where: { userId_year_month: { userId, year, month } },
    update: {
      totalMonthly,
      totalAnnual,
      expenseCount,
      potentialSavings,
      categoryBreakdown: JSON.stringify(categoryBreakdown),
      biggestChanges: JSON.stringify(biggestChanges.slice(0, 10)),
    },
    create: {
      userId,
      year,
      month,
      totalMonthly,
      totalAnnual,
      expenseCount,
      potentialSavings,
      categoryBreakdown: JSON.stringify(categoryBreakdown),
      biggestChanges: JSON.stringify(biggestChanges.slice(0, 10)),
    },
  })

  return snapshot
}

/**
 * Ensure a snapshot exists for the current month.
 * Called automatically when the dashboard loads or expenses change.
 * This is the "automatic" snapshot creation mechanism.
 */
export async function ensureCurrentMonthSnapshot(userId: string) {
  const now = new Date()
  return generateMonthlySnapshot(userId, now.getFullYear(), now.getMonth() + 1)
}

/**
 * Backfill snapshots for past months based on when expenses were created.
 * This gives historical context even for months before the user started using LifeOS.
 * Only creates snapshots for months where the user had expenses.
 */
export async function backfillHistoricalSnapshots(userId: string) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Find the earliest expense creation date
  const earliestExpense = await prisma.expense.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  })

  if (!earliestExpense) return []

  const created = new Date(earliestExpense.createdAt)
  let startYear = created.getFullYear()
  let startMonth = created.getMonth() + 1

  // Don't go back more than 12 months
  const maxMonthsBack = 12
  let monthsCount = 0
  let tempYear = currentYear
  let tempMonth = currentMonth - 1
  if (tempMonth < 1) { tempMonth = 12; tempYear-- }

  while (
    (tempYear > startYear || (tempYear === startYear && tempMonth >= startMonth)) &&
    monthsCount < maxMonthsBack
  ) {
    // Check if snapshot already exists
    const existing = await prisma.monthlySnapshot.findUnique({
      where: { userId_year_month: { userId, year: tempYear, month: tempMonth } },
    })

    if (!existing) {
      // For historical months, we approximate based on current active expenses
      // This isn't perfect but gives useful trend data
      await generateMonthlySnapshot(userId, tempYear, tempMonth)
    }

    monthsCount++
    tempMonth--
    if (tempMonth < 1) {
      tempMonth = 12
      tempYear--
    }
  }

  return prisma.monthlySnapshot.findMany({
    where: { userId },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  })
}

/**
 * Get all snapshots for a user, ordered chronologically.
 * Used for trend data on the reports page.
 */
export async function getUserSnapshots(userId: string, limit = 12) {
  return prisma.monthlySnapshot.findMany({
    where: { userId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: limit,
  })
}
