import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const historySchema = z.object({
  price: z.number().positive('Price must be positive'),
  date: z.string().optional(),
  notes: z.string().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Verify ownership
    const expense = await prisma.expense.findFirst({
      where: { id, userId: user.userId },
    })
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const history = await prisma.priceHistory.findMany({
      where: { expenseId: id },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ history })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const data = historySchema.parse(body)

    // Verify ownership
    const expense = await prisma.expense.findFirst({
      where: { id, userId: user.userId },
    })
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const history = await prisma.priceHistory.create({
      data: {
        expenseId: id,
        price: data.price,
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes,
      },
    })

    return NextResponse.json({ history }, { status: 201 })
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
