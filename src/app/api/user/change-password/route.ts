import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, verifyPassword, hashPassword } from '@/lib/auth'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = changePasswordSchema.parse(body)

    // Get user with password hash
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { passwordHash: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current password
    const isValid = await verifyPassword(data.currentPassword, dbUser.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Hash new password
    const newHash = await hashPassword(data.newPassword)

    // Update password
    await prisma.user.update({
      where: { id: user.userId },
      data: { passwordHash: newHash },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'password.changed',
        entity: 'user',
        entityId: user.userId,
      },
    })

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
