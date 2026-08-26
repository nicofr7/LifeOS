import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calculateAnnualCost } from '@/lib/utils'
import { ensureCurrentMonthSnapshot } from '@/lib/snapshots'
import { getExpenseLimit } from '@/lib/plan-gate'
import { z } from 'zod'

const expenseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().default('other'),
  monthlyCost: z.number().positive('Cost must be positive'),
  billingFrequency: z.string().default('monthly'),
  nextBillingDate: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isEssential: z.boolean().default(true),
  usageStatus: z.string().default('active'),
  cancellationDifficulty: z.string().default('easy'),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const archived = searchParams.get('archived') === 'true'

    const where: any = {
      userId: user.userId,
      isArchived: archived,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { provider: { contains: search } },
        { notes: { contains: search } },
      ]
    }

    if (category) {
      where.category = category
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        priceHistory: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        _count: {
          select: { recommendations: true },
        },
      },
    })

    return NextResponse.json({ expenses })
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
    const data = expenseSchema.parse(body)

    // Check expense limit for free users
    const fullUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true } })
    const plan = (fullUser?.plan || 'free') as 'free' | 'pro' | 'lifetime'
    const expenseLimit = getExpenseLimit(plan)

    if (plan === 'free') {
      const currentCount = await prisma.expense.count({
        where: { userId: user.userId, isArchived: false },
      })
      if (currentCount >= expenseLimit) {
        return NextResponse.json(
          { error: 'Expense limit reached', limit: expenseLimit, current: currentCount, upgradeRequired: true },
          { status: 403 }
        )
      }
    }

    const annualCost = calculateAnnualCost(data.monthlyCost, data.billingFrequency)

    const expense = await prisma.expense.create({
      data: {
        userId: user.userId,
        name: data.name,
        category: data.category,
        monthlyCost: data.monthlyCost,
        billingFrequency: data.billingFrequency,
        annualCost,
        nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate) : null,
        provider: data.provider,
        website: data.website,
        notes: data.notes,
        isEssential: data.isEssential,
        usageStatus: data.usageStatus,
        cancellationDifficulty: data.cancellationDifficulty,
      },
    })

    // Auto-create monthly snapshot after adding expense
    ensureCurrentMonthSnapshot(user.userId).catch(() => {})

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0] || error.format()?._errors?.[0]
      return NextResponse.json({ error: firstError?.message || 'Validation error' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
