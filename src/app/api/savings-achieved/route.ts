import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const savingsAchievedSchema = z.object({
  expenseId: z.string().optional(),
  recommendationId: z.string().optional(),
  actionType: z.enum(['cancelled', 'downgraded', 'negotiated', 'changed_billing', 'other']),
  description: z.string().min(1, 'Description is required'),
  previousMonthly: z.number().min(0, 'Previous monthly cost must be positive'),
  newMonthly: z.number().min(0, 'New monthly cost must be non-negative'),
  notes: z.string().optional(),
})

export async function GET() {
  try {
    const user = await requireAuth()

    const savingsAchieved = await prisma.savingsAchieved.findMany({
      where: { userId: user.userId },
      include: {
        expense: { select: { id: true, name: true, category: true } },
        recommendation: { select: { id: true, type: true, reason: true } },
      },
      orderBy: { confirmedAt: 'desc' },
    })

    // Calculate totals
    const totalMonthlySavings = savingsAchieved.reduce((sum, s) => sum + s.monthlySaving, 0)
    const totalAnnualSavings = savingsAchieved.reduce((sum, s) => sum + s.annualSaving, 0)

    // Group by action type
    const byActionType = savingsAchieved.reduce((acc, s) => {
      acc[s.actionType] = (acc[s.actionType] || 0) + s.monthlySaving
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      savingsAchieved,
      totals: {
        monthly: totalMonthlySavings,
        annual: totalAnnualSavings,
        count: savingsAchieved.length,
      },
      byActionType,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = savingsAchievedSchema.parse(body)

    // Verify expense ownership if provided
    if (data.expenseId) {
      const expense = await prisma.expense.findFirst({
        where: { id: data.expenseId, userId: user.userId },
      })
      if (!expense) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }
    }

    // Verify recommendation ownership if provided
    if (data.recommendationId) {
      const recommendation = await prisma.recommendation.findFirst({
        where: { id: data.recommendationId, userId: user.userId },
      })
      if (!recommendation) {
        return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
      }
    }

    const monthlySaving = data.previousMonthly - data.newMonthly
    const annualSaving = monthlySaving * 12

    const savingsAchieved = await prisma.savingsAchieved.create({
      data: {
        userId: user.userId,
        expenseId: data.expenseId || null,
        recommendationId: data.recommendationId || null,
        actionType: data.actionType,
        description: data.description,
        previousMonthly: data.previousMonthly,
        newMonthly: data.newMonthly,
        monthlySaving,
        annualSaving,
        notes: data.notes || null,
      },
      include: {
        expense: { select: { id: true, name: true } },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'savings_achieved.created',
        entity: 'savingsAchieved',
        entityId: savingsAchieved.id,
        details: JSON.stringify({
          actionType: data.actionType,
          monthlySaving,
          annualSaving,
        }),
      },
    })

    return NextResponse.json({ savingsAchieved }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0]
      return NextResponse.json({ error: firstError?.message || 'Validation error' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
