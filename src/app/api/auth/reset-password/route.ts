import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // Find the reset token
    const resetToken = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Check if token is already used
    if (resetToken.used) {
      return NextResponse.json(
        { error: 'This reset token has already been used' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (new Date() > resetToken.expires) {
      return NextResponse.json(
        { error: 'This reset token has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Hash the new password
    const passwordHash = await hashPassword(password)

    // Update the user's password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      // Invalidate all other reset tokens for this user
      prisma.passwordReset.updateMany({
        where: {
          userId: resetToken.userId,
          used: false,
          id: { not: resetToken.id },
        },
        data: { used: true },
      }),
      // Invalidate all existing sessions for security
      prisma.session.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0]
      return NextResponse.json({ error: firstError?.message || 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
