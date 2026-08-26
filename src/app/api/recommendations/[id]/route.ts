import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()

    const recommendation = await prisma.recommendation.findFirst({
      where: { id, userId: user.userId },
    })

    if (!recommendation) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
    }

    const updated = await prisma.recommendation.update({
      where: { id },
      data: { isActive: body.isActive ?? !recommendation.isActive },
      include: { expense: true },
    })

    return NextResponse.json({ recommendation: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
