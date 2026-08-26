import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, verifyPassword } from '@/lib/auth'
import { z } from 'zod'

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required for deletion'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = deleteAccountSchema.parse(body)

    // Get user with password hash
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { passwordHash: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify password
    const isValid = await verifyPassword(data.password, dbUser.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Password is incorrect' }, { status: 400 })
    }

    // Delete all user data (cascade handles most, but let's be explicit)
    const userId = user.userId

    // Delete in order of dependencies
    await prisma.auditLog.deleteMany({ where: { userId } })
    await prisma.notification.deleteMany({ where: { userId } })
    await prisma.passwordReset.deleteMany({ where: { userId } })
    await prisma.monthlySnapshot.deleteMany({ where: { userId } })
    await prisma.savingsAchieved.deleteMany({ where: { userId } })
    await prisma.expensePreference.deleteMany({ where: { userId } })
    await prisma.renewalReminder.deleteMany({ where: { userId } })
    await prisma.savingsGoal.deleteMany({ where: { userId } })
    await prisma.recommendation.deleteMany({ where: { userId } })

    // Delete expenses (which will cascade to priceHistory)
    const expenses = await prisma.expense.findMany({ where: { userId }, select: { id: true } })
    for (const expense of expenses) {
      await prisma.priceHistory.deleteMany({ where: { expenseId: expense.id } })
    }
    await prisma.expense.deleteMany({ where: { userId } })

    // Delete settings and sessions
    await prisma.userSettings.deleteMany({ where: { userId } })
    await prisma.session.deleteMany({ where: { userId } })

    // Finally delete the user
    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ success: true })
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
