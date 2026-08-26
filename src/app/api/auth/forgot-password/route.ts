import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, you will receive a password reset link.',
      })
    }

    // Invalidate any existing reset tokens for this user
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    })

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store the reset token
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expires,
      },
    })

    // Build reset URL
    const resetUrl = `${request.nextUrl.origin}/reset-password?token=${token}`

    // In development, return the link directly
    // In production, you would send an email here
    const isDev = process.env.NODE_ENV === 'development'

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, you will receive a password reset link.',
      // Dev mode: include the reset URL directly
      ...(isDev && {
        devMode: true,
        resetUrl,
        token,
      }),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0]
      return NextResponse.json({ error: firstError?.message || 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
