import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const preferenceSchema = z.object({
  preference: z.enum(['keep', 'ignore_recommendation', 'dont_suggest_again']),
  reason: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const preference = await prisma.expensePreference.findUnique({
      where: { userId_expenseId: { userId: user.userId, expenseId: id } },
    })

    return NextResponse.json({ preference })
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
    const data = preferenceSchema.parse(body)

    // Verify expense ownership
    const expense = await prisma.expense.findFirst({
      where: { id, userId: user.userId },
    })
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const preference = await prisma.expensePreference.upsert({
      where: { userId_expenseId: { userId: user.userId, expenseId: id } },
      update: {
        preference: data.preference,
        reason: data.reason || null,
      },
      create: {
        userId: user.userId,
        expenseId: id,
        preference: data.preference,
        reason: data.reason || null,
      },
    })

    return NextResponse.json({ preference })
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    await prisma.expensePreference.deleteMany({
      where: { userId: user.userId, expenseId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
