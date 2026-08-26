import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const settingsSchema = z.object({
  currency: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  savingsAlerts: z.boolean().optional(),
  renewalReminders: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
})

export async function GET() {
  try {
    const user = await requireAuth()

    let settings = await prisma.userSettings.findUnique({
      where: { userId: user.userId },
    })

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: user.userId,
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = settingsSchema.parse(body)

    // Ensure settings exist
    let settings = await prisma.userSettings.findUnique({
      where: { userId: user.userId },
    })

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: user.userId,
        },
      })
    }

    // Update settings
    settings = await prisma.userSettings.update({
      where: { userId: user.userId },
      data,
    })

    // If currency changed, also update the user's default currency
    if (data.currency) {
      await prisma.user.update({
        where: { id: user.userId },
        data: { currency: data.currency },
      })
    }

    return NextResponse.json({ settings })
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
