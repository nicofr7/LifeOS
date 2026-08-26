import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calculateMonthlyCost, roundMoney } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    const expenses = await prisma.expense.findMany({
      where: { userId: user.userId, isArchived: false },
      include: {
        priceHistory: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get user settings
    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.userId },
    })

    // Get savings achieved
    const savingsAchieved = await prisma.savingsAchieved.findMany({
      where: { userId: user.userId },
    })

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Name',
        'Category',
        'Monthly Cost',
        'Billing Frequency',
        'Annual Cost',
        'Provider',
        'Usage Status',
        'Essential',
        'Cancellation Difficulty',
        'Next Billing Date',
        'Website',
        'Notes',
        'Created At',
      ]

      const rows = expenses.map(expense => [
        `"${expense.name}"`,
        expense.category,
        expense.monthlyCost.toFixed(2),
        expense.billingFrequency,
        roundMoney(calculateMonthlyCost(expense.monthlyCost, expense.billingFrequency) * 12).toFixed(2),
        `"${expense.provider || ''}"`,
        expense.usageStatus,
        expense.isEssential ? 'Yes' : 'No',
        expense.cancellationDifficulty,
        expense.nextBillingDate ? new Date(expense.nextBillingDate).toISOString().split('T')[0] : '',
        `"${expense.website || ''}"`,
        `"${(expense.notes || '').replace(/"/g, '""')}"`,
        new Date(expense.createdAt).toISOString().split('T')[0],
      ])

      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="lifeos-expenses-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // JSON format
    const data = {
      exportDate: new Date().toISOString(),
      user: {
        name: user.name,
        email: user.email,
        currency: settings?.currency || 'USD',
      },
      expenses: expenses.map(expense => ({
        name: expense.name,
        category: expense.category,
        monthlyCost: expense.monthlyCost,
        billingFrequency: expense.billingFrequency,
        annualCost: roundMoney(calculateMonthlyCost(expense.monthlyCost, expense.billingFrequency) * 12),
        provider: expense.provider,
        usageStatus: expense.usageStatus,
        isEssential: expense.isEssential,
        cancellationDifficulty: expense.cancellationDifficulty,
        nextBillingDate: expense.nextBillingDate,
        website: expense.website,
        notes: expense.notes,
        createdAt: expense.createdAt,
        priceHistory: expense.priceHistory.map(ph => ({
          price: ph.price,
          date: ph.date,
          notes: ph.notes,
        })),
      })),
      savingsAchieved: savingsAchieved.map(s => ({
        description: s.description,
        monthlySaving: s.monthlySaving,
        annualSaving: s.annualSaving,
        confirmedAt: s.confirmedAt,
      })),
      summary: {
        totalExpenses: expenses.length,
        totalMonthly: roundMoney(expenses.reduce((sum, e) => sum + calculateMonthlyCost(e.monthlyCost, e.billingFrequency), 0)),
        totalAnnual: roundMoney(expenses.reduce((sum, e) => sum + calculateMonthlyCost(e.monthlyCost, e.billingFrequency), 0) * 12),
        totalSavingsAchieved: roundMoney(savingsAchieved.reduce((sum, s) => sum + s.annualSaving, 0)),
      },
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="lifeos-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
