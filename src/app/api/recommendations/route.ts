import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calculateAnnualCost, calculateMonthlyCost } from '@/lib/utils'

/**
 * Generates recommendations from user data.
 * Returns new recommendations that don't already exist for an expense+type combo.
 */
function generateRecommendations(expenses: any[]) {
  const recommendations: any[] = []

  // Duplicate detection: find categories with multiple expenses
  const categoryCounts: Record<string, { count: number; expenses: any[] }> = {}
  expenses.forEach(expense => {
    if (!categoryCounts[expense.category]) {
      categoryCounts[expense.category] = { count: 0, expenses: [] }
    }
    categoryCounts[expense.category].count++
    categoryCounts[expense.category].expenses.push(expense)
  })

  expenses.forEach(expense => {
    const monthlyCost = calculateMonthlyCost(expense.monthlyCost, expense.billingFrequency)
    const annualCost = monthlyCost * 12

    // Rule 1: Don't use -> Cancel
    if (expense.usageStatus === 'dont_use') {
      recommendations.push({
        expenseId: expense.id,
        type: 'cancel',
        reason: `You're not using ${expense.name} but paying ${monthlyCost.toFixed(2)}/month. Cancel it to save.`,
        estimatedSaving: roundSaving(annualCost),
        difficulty: expense.cancellationDifficulty || 'easy',
        confidence: 'high',
        dataUsed: 'calculated',
      })
    }

    // Rule 2: Rarely used and not essential -> Downgrade
    if (expense.usageStatus === 'rarely_used' && !expense.isEssential) {
      recommendations.push({
        expenseId: expense.id,
        type: 'downgrade',
        reason: `${expense.name} is rarely used. Consider downgrading to a cheaper plan or canceling.`,
        estimatedSaving: roundSaving(annualCost * 0.5),
        difficulty: expense.cancellationDifficulty || 'medium',
        confidence: 'medium',
        dataUsed: 'calculated',
      })
    }

    // Rule 3: Check for price increases
    if (expense.priceHistory && expense.priceHistory.length >= 2) {
      const latest = expense.priceHistory[0]
      const previous = expense.priceHistory[1]
      if (latest.price > previous.price * 1.1) {
        const increase = latest.price - previous.price
        const percentIncrease = ((increase / previous.price) * 100).toFixed(0)
        recommendations.push({
          expenseId: expense.id,
          type: 'negotiate',
          reason: `${expense.name} price increased ${percentIncrease}% ($${previous.price.toFixed(2)} → $${latest.price.toFixed(2)}). Try negotiating or switching providers.`,
          estimatedSaving: roundSaving(monthlyCost * 3),
          difficulty: 'medium',
          confidence: 'medium',
          dataUsed: 'calculated',
        })
      }
    }

    // Rule 4: Yearly billing discount suggestion
    if (expense.billingFrequency === 'monthly' && monthlyCost > 20) {
      recommendations.push({
        expenseId: expense.id,
        type: 'change_billing',
        reason: `Switch ${expense.name} to yearly billing to save approximately 15-20%.`,
        estimatedSaving: roundSaving(annualCost * 0.15),
        difficulty: 'easy',
        confidence: 'low',
        dataUsed: 'estimated',
      })
    }

    // Rule 5: Duplicate detection
    const catData = categoryCounts[expense.category]
    if (catData && catData.count > 1) {
      const otherExpenses = catData.expenses.filter(e => e.id !== expense.id)
      const higherCostOther = otherExpenses.find(o => monthlyCost <= calculateMonthlyCost(o.monthlyCost, o.billingFrequency))
      if (higherCostOther) {
        recommendations.push({
          expenseId: expense.id,
          type: 'remove_duplicate',
          reason: `Possible overlap: you have ${catData.count} services in ${expense.category.replace('_', ' ')}. Review if ${expense.name} and ${higherCostOther.name} serve similar purposes.`,
          estimatedSaving: roundSaving(annualCost),
          difficulty: 'medium',
          confidence: 'low',
          dataUsed: 'estimated',
        })
      }
    }
  })

  return recommendations.sort((a, b) => b.estimatedSaving - a.estimatedSaving)
}

function roundSaving(amount: number): number {
  return Math.round(amount * 100) / 100
}

export async function GET() {
  try {
    const user = await requireAuth()

    const existingRecommendations = await prisma.recommendation.findMany({
      where: { userId: user.userId },
      include: { expense: true },
    })

    return NextResponse.json({ recommendations: existingRecommendations })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const user = await requireAuth()

    const expenses = await prisma.expense.findMany({
      where: { userId: user.userId, isArchived: false },
      include: {
        priceHistory: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
    })

    // Get existing active/dismissed recommendations to preserve user choices
    const existingRecommendations = await prisma.recommendation.findMany({
      where: { userId: user.userId },
    })

    // Build a map of expenseId+type -> existing recommendation
    const existingMap = new Map<string, { isActive: boolean; isDismissed: boolean }>()
    existingRecommendations.forEach(rec => {
      existingMap.set(`${rec.expenseId}:${rec.type}`, {
        isActive: rec.isActive,
        isDismissed: rec.isDismissed,
      })
    })

    // Delete old recommendations
    await prisma.recommendation.deleteMany({
      where: { userId: user.userId },
    })

    // Generate fresh recommendations
    const newRecommendations = generateRecommendations(expenses)

    // Filter out dismissed recommendations and preserve isActive state
    const filteredRecommendations = newRecommendations
      .filter(rec => {
        const key = `${rec.expenseId}:${rec.type}`
        const existing = existingMap.get(key)
        if (existing?.isDismissed) return false
        return true
      })
      .map(rec => {
        const key = `${rec.expenseId}:${rec.type}`
        const existing = existingMap.get(key)
        return {
          ...rec,
          isActive: existing?.isActive ?? false,
        }
      })

    const createdRecommendations = await Promise.all(
      filteredRecommendations.map(rec =>
        prisma.recommendation.create({
          data: {
            expenseId: rec.expenseId,
            userId: user.userId,
            type: rec.type,
            reason: rec.reason,
            estimatedSaving: rec.estimatedSaving,
            difficulty: rec.difficulty,
            confidence: rec.confidence,
            dataUsed: rec.dataUsed,
            isActive: rec.isActive,
          },
          include: { expense: true },
        })
      )
    )

    return NextResponse.json({ recommendations: createdRecommendations })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
