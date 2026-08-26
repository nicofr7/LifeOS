import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calculateAnnualCost } from '@/lib/utils'
import { ensureCurrentMonthSnapshot } from '@/lib/snapshots'
import { z } from 'zod'

const updateExpenseSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  monthlyCost: z.number().positive().optional(),
  billingFrequency: z.string().optional(),
  nextBillingDate: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isEssential: z.boolean().optional(),
  usageStatus: z.string().optional(),
  cancellationDifficulty: z.string().optional(),
  isArchived: z.boolean().optional(),
})

async function verifyOwnership(expenseId: string, userId: string) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, userId },
  })
  if (!expense) {
    throw new Error('Expense not found')
  }
  return expense
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const expense = await prisma.expense.findFirst({
      where: { id, userId: user.userId },
      include: {
        priceHistory: {
          orderBy: { date: 'desc' },
        },
        recommendations: {
          orderBy: { createdAt: 'desc' },
        },
        renewalReminders: {
          orderBy: { remindAt: 'asc' },
        },
      },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    return NextResponse.json({ expense })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const data = updateExpenseSchema.parse(body)

    await verifyOwnership(id, user.userId)

    const updateData: any = { ...data }
    if (data.nextBillingDate) {
      updateData.nextBillingDate = new Date(data.nextBillingDate)
    }

    if (data.monthlyCost || data.billingFrequency) {
      const current = await prisma.expense.findUnique({ where: { id } })
      if (current) {
        updateData.annualCost = calculateAnnualCost(
          data.monthlyCost || current.monthlyCost,
          data.billingFrequency || current.billingFrequency
        )
      }
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
    })

    // Auto-update monthly snapshot after expense change
    ensureCurrentMonthSnapshot(user.userId).catch(() => {})

    return NextResponse.json({ expense })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Expense not found') {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0] || error.format()?._errors?.[0]
      return NextResponse.json({ error: firstError?.message || 'Validation error' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    await verifyOwnership(id, user.userId)

    await prisma.expense.delete({
      where: { id },
    })

    // Auto-update monthly snapshot after expense deletion
    ensureCurrentMonthSnapshot(user.userId).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Expense not found') {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
