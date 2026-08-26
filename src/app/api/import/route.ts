import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calculateAnnualCost } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { expenses, mappings } = body

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return NextResponse.json({ error: 'No expenses to import' }, { status: 400 })
    }

    const imported = []
    const errors = []

    for (let i = 0; i < expenses.length; i++) {
      const row = expenses[i]
      try {
        const name = row[mappings.name] || row.name || row.Name || ''
        const cost = parseFloat(row[mappings.monthlyCost] || row.monthlyCost || row.cost || row.Cost || '0')
        const category = row[mappings.category] || row.category || row.Category || 'other'
        const frequency = row[mappings.billingFrequency] || row.billingFrequency || row.frequency || 'monthly'
        const provider = row[mappings.provider] || row.provider || row.Provider || ''
        const notes = row[mappings.notes] || row.notes || row.Notes || ''

        if (!name || isNaN(cost) || cost <= 0) {
          errors.push({ row: i + 1, error: 'Missing name or invalid cost' })
          continue
        }

        const annualCost = calculateAnnualCost(cost, frequency)

        const expense = await prisma.expense.create({
          data: {
            userId: user.userId,
            name,
            category,
            monthlyCost: cost,
            billingFrequency: frequency,
            annualCost,
            provider: provider || null,
            notes: notes || null,
          },
        })

        imported.push(expense)
      } catch (err) {
        errors.push({ row: i + 1, error: 'Failed to import row' })
      }
    }

    return NextResponse.json({
      imported: imported.length,
      errors,
      total: expenses.length,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
