import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calculateMonthlyCost, calculatePotentialSavings, calculateEfficiencyScore, roundMoney, calculateAnnualCost, getNextBillingDate } from '@/lib/utils'
import { ensureCurrentMonthSnapshot } from '@/lib/snapshots'

// Calculate expense health status
function getExpenseHealth(expense: any): string {
  // Check if unused
  if (expense.usageStatus === 'dont_use') return 'unnecessary'
  
  // Check if rarely used
  if (expense.usageStatus === 'rarely_used') return 'review'
  
  // Check for price increase
  if (expense.priceHistory && expense.priceHistory.length >= 2) {
    const latest = expense.priceHistory[0]
    const previous = expense.priceHistory[1]
    if (latest.price > previous.price * 1.1) return 'price_increased'
  }
  
  // Check for upcoming renewal (within 7 days)
  if (expense.nextBillingDate) {
    const now = new Date()
    const renewal = new Date(expense.nextBillingDate)
    const daysUntilRenewal = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilRenewal <= 7 && daysUntilRenewal >= 0) return 'renewal_soon'
  }
  
  // Check for duplicates in same category
  // This will be checked at the user level, not here
  
  return 'healthy'
}

// Calculate 12-month forecast
function calculate12MonthForecast(expenses: any[]): { totalForecast: number; monthlyForecast: number[]; largestMonths: { month: string; amount: number }[] } {
  const now = new Date()
  const monthlyForecast: number[] = []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const targetMonth = targetDate.getMonth()
    const targetYear = targetDate.getFullYear()
    
    let monthTotal = 0
    
    expenses.forEach(expense => {
      const monthlyCost = calculateMonthlyCost(expense.monthlyCost, expense.billingFrequency)
      
      // Add base monthly cost
      monthTotal += monthlyCost
      
      // For non-monthly billing, check if this expense has a payment in this month
      if (expense.billingFrequency !== 'monthly' && expense.nextBillingDate) {
        const nextBilling = new Date(expense.nextBillingDate)
        
        // Check if this expense has a payment in the target month
        const tempDate = new Date(nextBilling)
        while (tempDate < new Date(targetYear, targetMonth + 1, 1)) {
          if (tempDate.getMonth() === targetMonth && tempDate.getFullYear() === targetYear) {
            // Add the extra cost (since we already added monthly cost)
            const actualCost = expense.monthlyCost
            monthTotal += (actualCost - monthlyCost)
            break
          }
          // Move to next billing cycle
          if (expense.billingFrequency === 'quarterly') tempDate.setMonth(tempDate.getMonth() + 3)
          else if (expense.billingFrequency === 'semi-annual') tempDate.setMonth(tempDate.getMonth() + 6)
          else if (expense.billingFrequency === 'yearly') tempDate.setFullYear(tempDate.getFullYear() + 1)
          else if (expense.billingFrequency === 'weekly') tempDate.setDate(tempDate.getDate() + 7)
          else if (expense.billingFrequency === 'bi-weekly') tempDate.setDate(tempDate.getDate() + 14)
          else if (expense.billingFrequency === 'every-2-months') tempDate.setMonth(tempDate.getMonth() + 2)
          else break
        }
      }
    })
    
    monthlyForecast.push(roundMoney(monthTotal))
  }
  
  const totalForecast = roundMoney(monthlyForecast.reduce((sum, m) => sum + m, 0))
  
  // Find largest months
  const largestMonths = monthlyForecast
    .map((amount, idx) => ({
      month: monthNames[(now.getMonth() + idx) % 12],
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
  
  return { totalForecast, monthlyForecast, largestMonths }
}

export async function GET() {
  try {
    const user = await requireAuth()

    const expenses = await prisma.expense.findMany({
      where: { userId: user.userId, isArchived: false },
      include: {
        priceHistory: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        preferences: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get actual savings achieved
    const savingsAchieved = await prisma.savingsAchieved.findMany({
      where: { userId: user.userId },
    })
    
    const totalActualMonthlySavings = roundMoney(savingsAchieved.reduce((sum, s) => sum + s.monthlySaving, 0))
    const totalActualAnnualSavings = roundMoney(savingsAchieved.reduce((sum, s) => sum + s.annualSaving, 0))

    // Calculate totals using normalized monthly costs
    const totalMonthly = roundMoney(expenses.reduce((sum, e) => sum + calculateMonthlyCost(e.monthlyCost, e.billingFrequency), 0))
    const totalAnnual = roundMoney(totalMonthly * 12)
    const totalExpenses = expenses.length

    // Potential savings
    const potentialSavings = calculatePotentialSavings(expenses)
    const potentialMonthlySavings = roundMoney(potentialSavings / 12)

    // Expense health status
    const expensesWithHealth = expenses.map(e => ({
      ...e,
      health: getExpenseHealth(e),
      normalizedMonthlyCost: roundMoney(calculateMonthlyCost(e.monthlyCost, e.billingFrequency)),
      normalizedAnnualCost: roundMoney(calculateMonthlyCost(e.monthlyCost, e.billingFrequency) * 12),
      hasPreference: e.preferences.length > 0,
      preference: e.preferences[0]?.preference || null,
    }))

    // Health summary
    const healthSummary = {
      healthy: expensesWithHealth.filter(e => e.health === 'healthy').length,
      review: expensesWithHealth.filter(e => e.health === 'review').length,
      unnecessary: expensesWithHealth.filter(e => e.health === 'unnecessary').length,
      price_increased: expensesWithHealth.filter(e => e.health === 'price_increased').length,
      renewal_soon: expensesWithHealth.filter(e => e.health === 'renewal_soon').length,
    }

    // 12-month forecast
    const forecast = calculate12MonthForecast(expenses)

    // "What if I do nothing" comparison
    const currentMonthly = totalMonthly
    const current12Month = forecast.totalForecast
    
    // Calculate savings if top 3 recommendations are completed
    const activeRecommendations = await prisma.recommendation.findMany({
      where: { 
        userId: user.userId, 
        isActive: false,
        isDismissed: false,
      },
      orderBy: { estimatedSaving: 'desc' },
      take: 3,
    })
    
    const potentialIfCompleted = roundMoney(
      activeRecommendations.reduce((sum, r) => sum + r.estimatedSaving, 0)
    )
    const monthlyIfCompleted = roundMoney(potentialIfCompleted / 12)
    const forecastIfCompleted = roundMoney(current12Month - potentialIfCompleted)

    // Biggest expenses (using normalized monthly cost)
    const biggestExpenses = expensesWithHealth
      .sort((a, b) => b.normalizedMonthlyCost - a.normalizedMonthlyCost)
      .slice(0, 5)

    // Recently added
    const recentlyAdded = expensesWithHealth.slice(0, 5)

    // Upcoming renewals
    const now = new Date()
    const upcomingRenewals = expensesWithHealth
      .filter(e => e.nextBillingDate && new Date(e.nextBillingDate) >= now)
      .sort((a, b) => new Date(a.nextBillingDate!).getTime() - new Date(b.nextBillingDate!).getTime())
      .slice(0, 5)

    // Potentially unnecessary
    const potentiallyUnnecessary = expensesWithHealth
      .filter(e => e.health === 'unnecessary' || e.health === 'review')

    // Category breakdown (using normalized monthly costs)
    const categoryBreakdown = expenses.reduce((acc, e) => {
      const monthly = calculateMonthlyCost(e.monthlyCost, e.billingFrequency)
      acc[e.category] = roundMoney((acc[e.category] || 0) + monthly)
      return acc
    }, {} as Record<string, number>)

    // Financial Efficiency Score
    const efficiencyData = calculateEfficiencyScore(expenses)

    // Action Center: Build ranked list of actions
    const actions: {
      expenseId: string
      expenseName: string
      type: string
      reason: string
      potentialSaving: number
      confidence: string
      urgency: string
      difficulty: string
      health: string
      hasPreference: boolean
    }[] = []

    // Unused expenses are highest priority
    expensesWithHealth
      .filter(e => e.health === 'unnecessary' && !e.hasPreference)
      .forEach(e => {
        const annual = e.normalizedAnnualCost
        actions.push({
          expenseId: e.id,
          expenseName: e.name,
          type: 'cancel',
          reason: `You marked \"${e.name}\" as not using it.`,
          potentialSaving: roundMoney(annual),
          confidence: 'high',
          urgency: 'high',
          difficulty: e.cancellationDifficulty || 'easy',
          health: e.health,
          hasPreference: e.hasPreference,
        })
      })

    // Rarely used
    expensesWithHealth
      .filter(e => e.health === 'review' && !e.hasPreference)
      .forEach(e => {
        const annual = e.normalizedAnnualCost
        actions.push({
          expenseId: e.id,
          expenseName: e.name,
          type: 'review',
          reason: `You rarely use \"${e.name}\". Consider downgrading or canceling.`,
          potentialSaving: roundMoney(annual * 0.5),
          confidence: 'medium',
          urgency: 'medium',
          difficulty: e.cancellationDifficulty || 'medium',
          health: e.health,
          hasPreference: e.hasPreference,
        })
      })

    // Price increases
    expensesWithHealth
      .filter(e => e.health === 'price_increased' && !e.hasPreference)
      .forEach(e => {
        if (e.priceHistory && e.priceHistory.length >= 2) {
          const latest = e.priceHistory[0]
          const previous = e.priceHistory[1]
          if (latest.price > previous.price * 1.1) {
            const increase = latest.price - previous.price
            actions.push({
              expenseId: e.id,
              expenseName: e.name,
              type: 'negotiate',
              reason: `Price increased by $${increase.toFixed(2)} (${((increase / previous.price) * 100).toFixed(0)}%). Consider negotiating.`,
              potentialSaving: roundMoney(e.normalizedMonthlyCost * 3),
              confidence: 'medium',
              urgency: 'medium',
              difficulty: 'medium',
              health: e.health,
              hasPreference: e.hasPreference,
            })
          }
        }
      })

    // Upcoming renewals (within 7 days)
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    expensesWithHealth
      .filter(e => e.health === 'renewal_soon' && !e.hasPreference)
      .forEach(e => {
        actions.push({
          expenseId: e.id,
          expenseName: e.name,
          type: 'renewal',
          reason: `Renews within 7 days. Review before it charges.`,
          potentialSaving: 0,
          confidence: 'high',
          urgency: 'high',
          difficulty: 'easy',
          health: e.health,
          hasPreference: e.hasPreference,
        })
      })

    // Sort actions: urgency > potential saving
    actions.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 }
      const urgDiff = (urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 2) - (urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 2)
      if (urgDiff !== 0) return urgDiff
      return b.potentialSaving - a.potentialSaving
    })

    // Auto-create monthly snapshot in background (non-blocking)
    ensureCurrentMonthSnapshot(user.userId).catch(() => {})

    return NextResponse.json({
      totalMonthly,
      totalAnnual,
      totalExpenses,
      potentialSavings,
      potentialMonthlySavings,
      biggestExpenses,
      recentlyAdded,
      upcomingRenewals,
      potentiallyUnnecessary,
      categoryBreakdown,
      efficiencyScore: efficiencyData,
      actions: actions.slice(0, 10),
      // New fields
      actualSavings: {
        monthly: totalActualMonthlySavings,
        annual: totalActualAnnualSavings,
        count: savingsAchieved.length,
      },
      forecast,
      comparison: {
        currentMonthly,
        current12Month,
        potentialIfCompleted,
        monthlyIfCompleted,
        forecastIfCompleted,
        savingsDifference: roundMoney(current12Month - forecastIfCompleted),
      },
      healthSummary,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
