import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getGoalLimit } from '@/lib/plan-gate'
import { z } from 'zod'

const goalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmount: z.number().positive('Target must be positive'),
  deadline: z.string().optional().nullable(),
})

export async function GET() {
  try {
    const user = await requireAuth()

    const goals = await prisma.savingsGoal.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ goals })
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
    const data = goalSchema.parse(body)

    // Check goal limit for free users
    const fullUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true } })
    const plan = (fullUser?.plan || 'free') as 'free' | 'pro' | 'lifetime'
    const goalLimit = getGoalLimit(plan)

    if (plan === 'free') {
      const currentCount = await prisma.savingsGoal.count({
        where: { userId: user.userId, isCompleted: false },
      })
      if (currentCount >= goalLimit) {
        return NextResponse.json(
          { error: 'Goal limit reached', limit: goalLimit, current: currentCount, upgradeRequired: true },
          { status: 403 }
        )
      }
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId: user.userId,
        name: data.name,
        targetAmount: data.targetAmount,
        deadline: data.deadline ? new Date(data.deadline) : null,
      },
    })

    return NextResponse.json({ goal }, { status: 201 })
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
