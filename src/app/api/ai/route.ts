import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { formatCurrency, calculateMonthlyCost, calculatePotentialSavings } from '@/lib/utils'

interface AIInsight {
  type: 'warning' | 'info' | 'saving' | 'tip'
  title: string
  description: string
  potentialSaving?: number
  action?: string
}

function generateInsights(expenses: any[]): AIInsight[] {
  const insights: AIInsight[] = []
  
  if (expenses.length === 0) {
    insights.push({
      type: 'info',
      title: 'Get Started',
      description: 'Add your first recurring expense to start tracking your spending.',
    })
    return insights
  }

  // Calculate totals
  const totalMonthly = expenses.reduce((sum, e) => sum + calculateMonthlyCost(e.monthlyCost, e.billingFrequency), 0)
  const totalAnnual = totalMonthly * 12
  
  // Insight: Total spending
  insights.push({
    type: 'info',
    title: 'Your Monthly Spending',
    description: `You're spending ${formatCurrency(totalMonthly)}/month (${formatCurrency(totalAnnual)}) on recurring expenses.`,
  })

  // Insight: Unused subscriptions
  const unused = expenses.filter(e => e.usageStatus === 'dont_use')
  if (unused.length > 0) {
    const unusedMonthly = unused.reduce((sum, e) => sum + calculateMonthlyCost(e.monthlyCost, e.billingFrequency), 0)
    insights.push({
      type: 'saving',
      title: `${unused.length} Unused Subscription${unused.length > 1 ? 's' : ''}`,
      description: `You have ${unused.length} subscription${unused.length > 1 ? 's' : ''} you're not using: ${unused.map(e => e.name).join(', ')}. Canceling could save ${formatCurrency(unusedMonthly)}/month.`,
      potentialSaving: unusedMonthly * 12,
      action: 'Cancel unused subscriptions',
    })
  }

  // Insight: Rarely used
  const rarelyUsed = expenses.filter(e => e.usageStatus === 'rarely_used')
  if (rarelyUsed.length > 0) {
    const rarelyMonthly = rarelyUsed.reduce((sum, e) => sum + calculateMonthlyCost(e.monthlyCost, e.billingFrequency), 0)
    insights.push({
      type: 'warning',
      title: `${rarelyUsed.length} Rarely Used Service${rarelyUsed.length > 1 ? 's' : ''}`,
      description: `You have ${rarelyUsed.length} service${rarelyUsed.length > 1 ? 's' : ''} you rarely use: ${rarelyUsed.map(e => e.name).join(', ')}. Consider downgrading or canceling.`,
      potentialSaving: rarelyMonthly * 6,
      action: 'Review rarely used services',
    })
  }

  // Insight: Duplicate categories
  const categoryCounts: Record<string, number> = {}
  expenses.forEach(e => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1
  })

  const duplicateCategories = Object.entries(categoryCounts).filter(([_, count]) => count > 1)
  if (duplicateCategories.length > 0) {
    const catNames = duplicateCategories.map(([cat]) => cat.replace('_', ' ')).join(', ')
    insights.push({
      type: 'tip',
      title: 'Multiple Services in Same Category',
      description: `You have multiple services in: ${catNames}. Consider if you really need all of them.`,
    })
  }

  // Insight: High cost items
  const highCost = expenses
    .filter(e => calculateMonthlyCost(e.monthlyCost, e.billingFrequency) > 50)
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
  
  if (highCost.length > 0) {
    insights.push({
      type: 'info',
      title: 'Top Expenses',
      description: `Your highest recurring expense is ${highCost[0].name} at ${formatCurrency(highCost[0].monthlyCost)}/month.`,
    })
  }

  // Insight: Upcoming renewals
  const now = new Date()
  const upcomingRenewals = expenses.filter(e => {
    if (!e.nextBillingDate) return false
    const renewal = new Date(e.nextBillingDate)
    const daysUntil = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil >= 0 && daysUntil <= 7
  })

  if (upcomingRenewals.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Upcoming Renewals',
      description: `${upcomingRenewals.length} expense${upcomingRenewals.length > 1 ? 's' : ''} renew within 7 days: ${upcomingRenewals.map(e => e.name).join(', ')}.`,
    })
  }

  // Insight: Potential savings summary
  const potentialSavings = calculatePotentialSavings(expenses)
  if (potentialSavings > 0) {
    insights.push({
      type: 'saving',
      title: 'Potential Annual Savings',
      description: `By canceling unused and rarely used services, you could save approximately ${formatCurrency(potentialSavings)}/year.`,
      potentialSaving: potentialSavings,
    })
  }

  return insights
}

export async function GET() {
  try {
    const user = await requireAuth()

    const expenses = await prisma.expense.findMany({
      where: { userId: user.userId, isArchived: false },
      orderBy: { createdAt: 'desc' },
    })

    const insights = generateInsights(expenses)

    return NextResponse.json({ insights })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
