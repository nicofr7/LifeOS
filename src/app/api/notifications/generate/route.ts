import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calculateMonthlyCost, roundMoney } from '@/lib/utils'

/**
 * Generate notifications based on current expense data.
 * Called periodically or on-demand to keep notifications fresh.
 */
export async function POST() {
  try {
    const user = await requireAuth()
    const now = new Date()
    const sevenDaysFromNow = new Date(now)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const thirtyDaysFromNow = new Date(now)
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const expenses = await prisma.expense.findMany({
      where: { userId: user.userId, isArchived: false },
      include: {
        priceHistory: { orderBy: { date: 'desc' }, take: 5 },
      },
    })

    const notifications: Array<{
      title: string
      message: string
      type: string
      actionUrl?: string
    }> = []

    for (const expense of expenses) {
      const monthlyCost = calculateMonthlyCost(expense.monthlyCost, expense.billingFrequency)

      // Renewal approaching (within 7 days)
      if (expense.nextBillingDate) {
        const renewalDate = new Date(expense.nextBillingDate)
        if (renewalDate >= now && renewalDate <= sevenDaysFromNow) {
          const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          // Check if we already have a recent notification for this
          const existing = await prisma.notification.findFirst({
            where: {
              userId: user.userId,
              actionUrl: `/expenses/${expense.id}`,
              type: 'renewal',
              createdAt: { gte: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
            },
          })
          if (!existing) {
            notifications.push({
              title: `${expense.name} renews in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
              message: `You'll be charged ${roundMoney(monthlyCost).toFixed(2)} on ${renewalDate.toLocaleDateString()}.`,
              type: 'renewal',
              actionUrl: `/expenses/${expense.id}`,
            })
          }
        }
      }

      // Price increase detected
      if (expense.priceHistory.length >= 2) {
        const latest = expense.priceHistory[0]
        const previous = expense.priceHistory[1]
        if (latest && previous && previous.price > 0) {
          const changePercent = ((latest.price - previous.price) / previous.price) * 100
          if (changePercent > 10) {
            const existing = await prisma.notification.findFirst({
              where: {
                userId: user.userId,
                actionUrl: `/expenses/${expense.id}`,
                type: 'warning',
                createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
              },
            })
            if (!existing) {
              notifications.push({
                title: `${expense.name} price increased ${Math.round(changePercent)}%`,
                message: `Cost went from ${previous.price.toFixed(2)} to ${latest.price.toFixed(2)}. Consider reviewing this expense.`,
                type: 'warning',
                actionUrl: `/expenses/${expense.id}`,
              })
            }
          }
        }
      }

      // Savings opportunity: unused
      if (expense.usageStatus === 'dont_use') {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: user.userId,
            actionUrl: `/expenses/${expense.id}`,
            type: 'saving',
            createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
          },
        })
        if (!existing) {
          notifications.push({
            title: `Unused: ${expense.name}`,
            message: `You could save ${roundMoney(monthlyCost * 12).toFixed(2)}/year by canceling this.`,
            type: 'saving',
            actionUrl: `/expenses/${expense.id}`,
          })
        }
      }
    }

    // Create notifications in bulk
    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications.map(n => ({
          userId: user.userId,
          title: n.title,
          message: n.message,
          type: n.type,
          actionUrl: n.actionUrl || null,
        })),
      })
    }

    return NextResponse.json({ created: notifications.length })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
