import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, addMonths, addYears, addWeeks } from 'date-fns'
import { prisma } from './prisma'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ===== Currency Formatting =====

const currencyCache: Record<string, Intl.NumberFormat> = {}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const key = `${currency}-${amount}`
  if (!currencyCache[key]) {
    currencyCache[key] = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }
  return currencyCache[key].format(amount)
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`
  }
  return formatCurrency(amount)
}

// ===== Date Formatting =====

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatShortDate(date: Date | string): string {
  return format(new Date(date), 'MMM d')
}

export function formatRelativeDate(date: Date | string): string {
  const now = new Date()
  const target = new Date(date)
  const days = differenceInDays(target, now)
  if (days < 0) return `${Math.abs(days)} days ago`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 7) return `In ${days} days`
  if (days <= 30) return `In ${Math.ceil(days / 7)} weeks`
  return formatShortDate(date)
}

// ===== Billing Frequency Normalization =====

// All costs are normalized: the user enters the amount they PAY per billing cycle.
// The name "monthlyCost" in the database is a legacy name — it stores the per-cycle amount.
// calculateMonthlyCost normalizes any billing cycle to a monthly equivalent.

export function calculateMonthlyCost(costPerCycle: number, billingFrequency: string): number {
  switch (billingFrequency) {
    case 'weekly':
      return costPerCycle * (52 / 12) // 4.333...
    case 'bi-weekly':
      return costPerCycle * (26 / 12) // 2.166...
    case 'every-2-months':
      return costPerCycle / 2
    case 'monthly':
      return costPerCycle
    case 'quarterly':
      return costPerCycle / 3
    case 'semi-annual':
      return costPerCycle / 6
    case 'yearly':
      return costPerCycle / 12
    default:
      return costPerCycle
  }
}

export function calculateAnnualCost(costPerCycle: number, billingFrequency: string): number {
  return calculateMonthlyCost(costPerCycle, billingFrequency) * 12
}

// Round to 2 decimal places for display
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

// ===== Potential Savings Calculation =====

export function calculatePotentialSavings(expenses: {
  monthlyCost: number
  billingFrequency: string
  usageStatus: string
  isEssential: boolean
}[]): number {
  return roundMoney(expenses.reduce((total, expense) => {
    const annual = calculateAnnualCost(expense.monthlyCost, expense.billingFrequency)
    if (expense.usageStatus === 'dont_use') {
      return total + annual
    }
    if (expense.usageStatus === 'rarely_used' && !expense.isEssential) {
      return total + annual * 0.5 // 6 months of savings
    }
    return total
  }, 0))
}

// ===== Renewal Helpers =====

export function getDaysUntilRenewal(nextBillingDate: Date | string | null): number | null {
  if (!nextBillingDate) return null
  const now = new Date()
  const renewal = new Date(nextBillingDate)
  return differenceInDays(renewal, now)
}

export function getNextBillingDate(frequency: string, fromDate: Date = new Date()): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(fromDate, 1)
    case 'bi-weekly':
      return addWeeks(fromDate, 2)
    case 'every-2-months':
      return addMonths(fromDate, 2)
    case 'monthly':
      return addMonths(fromDate, 1)
    case 'quarterly':
      return addMonths(fromDate, 3)
    case 'semi-annual':
      return addMonths(fromDate, 6)
    case 'yearly':
      return addYears(fromDate, 1)
    default:
      return addMonths(fromDate, 1)
  }
}

// ===== Financial Efficiency Score =====

export function calculateEfficiencyScore(expenses: {
  monthlyCost: number
  billingFrequency: string
  usageStatus: string
  isEssential: boolean
  category: string
  priceHistory?: { price: number }[]
}[]): { score: number; breakdown: Record<string, number>; explanations: string[] } {
  if (expenses.length === 0) {
    return { score: 100, breakdown: {}, explanations: ['No expenses tracked yet'] }
  }

  let score = 100
  const breakdown: Record<string, number> = {}
  const explanations: string[] = []

  // Penalty for unused expenses (up to -30)
  const unused = expenses.filter(e => e.usageStatus === 'dont_use')
  const unusedAnnual = unused.reduce((sum, e) => sum + calculateAnnualCost(e.monthlyCost, e.billingFrequency), 0)
  if (unused.length > 0) {
    const penalty = Math.min(30, unused.length * 10)
    score -= penalty
    breakdown['Unused services'] = -penalty
    explanations.push(`${unused.length} service${unused.length > 1 ? 's' : ''} you're not using`)
  }

  // Penalty for rarely used (up to -15)
  const rarelyUsed = expenses.filter(e => e.usageStatus === 'rarely_used')
  if (rarelyUsed.length > 0) {
    const penalty = Math.min(15, rarelyUsed.length * 5)
    score -= penalty
    breakdown['Rarely used'] = -penalty
    explanations.push(`${rarelyUsed.length} service${rarelyUsed.length > 1 ? 's' : ''} rarely used`)
  }

  // Penalty for duplicate categories (up to -15)
  const categoryCounts: Record<string, number> = {}
  expenses.forEach(e => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1
  })
  const duplicates = Object.entries(categoryCounts).filter(([_, count]) => count > 1)
  if (duplicates.length > 0) {
    const penalty = Math.min(15, duplicates.reduce((sum, [_, count]) => sum + (count - 1) * 5, 0))
    score -= penalty
    breakdown['Potential duplicates'] = -penalty
    const catNames = duplicates.map(([cat]) => cat.replace('_', ' ')).join(', ')
    explanations.push(`Multiple services in: ${catNames}`)
  }

  // Penalty for price increases (up to -10)
  let priceIncreaseCount = 0
  expenses.forEach(e => {
    if (e.priceHistory && e.priceHistory.length >= 2) {
      const latest = e.priceHistory[0].price
      const previous = e.priceHistory[1].price
      if (latest > previous * 1.1) {
        priceIncreaseCount++
      }
    }
  })
  if (priceIncreaseCount > 0) {
    const penalty = Math.min(10, priceIncreaseCount * 5)
    score -= penalty
    breakdown['Price increases'] = -penalty
    explanations.push(`${priceIncreaseCount} expense${priceIncreaseCount > 1 ? 's' : ''} with significant price increases`)
  }

  // Bonus for all expenses being essential and active (up to +5)
  const allEssentialActive = expenses.every(e => e.isEssential && e.usageStatus === 'active')
  if (allEssentialActive) {
    score += 5
    breakdown['All essential & active'] = 5
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
    explanations,
  }
}

// ===== Constants =====

export const EXPENSE_CATEGORIES = [
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'utilities', name: 'Utilities', icon: '💡' },
  { id: 'insurance', name: 'Insurance', icon: '🛡️' },
  { id: 'transportation', name: 'Transportation', icon: '🚗' },
  { id: 'food', name: 'Food', icon: '🍽️' },
  { id: 'software', name: 'Software', icon: '💻' },
  { id: 'health_fitness', name: 'Health & Fitness', icon: '💪' },
  { id: 'shopping', name: 'Shopping', icon: '🛒' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'other', name: 'Other', icon: '📦' },
] as const

export const BILLING_FREQUENCIES = [
  { id: 'weekly', name: 'Weekly' },
  { id: 'bi-weekly', name: 'Bi-weekly' },
  { id: 'monthly', name: 'Monthly' },
  { id: 'every-2-months', name: 'Every 2 months' },
  { id: 'quarterly', name: 'Quarterly' },
  { id: 'semi-annual', name: 'Every 6 months' },
  { id: 'yearly', name: 'Yearly' },
] as const

export const USAGE_STATUSES = [
  { id: 'active', name: 'Active', color: 'text-green-500' },
  { id: 'rarely_used', name: 'Rarely Used', color: 'text-yellow-500' },
  { id: 'dont_use', name: "Don't Use", color: 'text-red-500' },
] as const

export const CANCELLATION_DIFFICULTIES = [
  { id: 'easy', name: 'Easy', color: 'text-green-500' },
  { id: 'medium', name: 'Medium', color: 'text-yellow-500' },
  { id: 'hard', name: 'Hard', color: 'text-red-500' },
] as const

export const CURRENCIES = [
  { id: 'USD', name: 'US Dollar', symbol: '$' },
  { id: 'EUR', name: 'Euro', symbol: '€' },
  { id: 'GBP', name: 'British Pound', symbol: '£' },
  { id: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { id: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { id: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
] as const

// ===== Audit Log =====

export async function createAuditLog(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
      },
    })
  } catch {
    // Don't let audit log failures break the main operation
  }
}

// ===== Notification Helper =====

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'info',
  actionUrl?: string
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        actionUrl: actionUrl || null,
      },
    })
  } catch {
    // Don't let notification failures break the main operation
  }
}
