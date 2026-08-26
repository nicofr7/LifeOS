"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  ChevronRight,
  Radar,
  Target,
  Calendar,
  DollarSign,
  Shield,
  AlertTriangle,
  Clock,
  Circle,
  ArrowUpRight,
  Sparkles,
} from "lucide-react"

interface Expense {
  id: string
  name: string
  category: string
  monthlyCost: number
  billingFrequency: string
  nextBillingDate: string | null
  usageStatus: string
  isEssential: boolean
  normalizedMonthlyCost: number
  normalizedAnnualCost: number
  health: string
}

interface Action {
  expenseId: string
  expenseName: string
  type: string
  reason: string
  potentialSaving: number
  confidence: string
  urgency: string
  difficulty: string
  health: string
}

interface DashboardData {
  totalMonthly: number
  totalAnnual: number
  totalExpenses: number
  potentialSavings: number
  biggestExpenses: Expense[]
  recentlyAdded: Expense[]
  upcomingRenewals: Expense[]
  categoryBreakdown: Record<string, number>
  actions: Action[]
  actualSavings: { monthly: number; annual: number; count: number }
  forecast: { totalForecast: number; monthlyForecast: number[]; largestMonths: Array<{ month: string; amount: number }> }
  comparison: {
    currentMonthly: number
    current12Month: number
    potentialIfCompleted: number
    monthlyIfCompleted: number
    forecastIfCompleted: number
    savingsDifference: number
  }
  healthSummary: {
    healthy: number
    review: number
    unnecessary: number
    price_increased: number
    renewal_soon: number
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  insurance: "#111827",
  utilities: "#374151",
  health_fitness: "#059669",
  entertainment: "#7C3AED",
  software: "#2563EB",
  transportation: "#D97706",
  food: "#DC2626",
  shopping: "#EC4899",
  education: "#0EA5E9",
  other: "#6B7280",
}

const CATEGORY_LABELS: Record<string, string> = {
  insurance: "Insurance",
  utilities: "Utilities",
  health_fitness: "Health & Fitness",
  entertainment: "Entertainment",
  software: "Software",
  transportation: "Transportation",
  food: "Food",
  shopping: "Shopping",
  education: "Education",
  other: "Other",
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch("/api/dashboard")
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-72" />
        <div className="skeleton h-32" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
        <div className="skeleton h-48" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
          <Radar className="w-8 h-8 text-muted" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Welcome to LifeOS</h3>
        <p className="text-muted mb-6 max-w-md mx-auto">
          Start tracking your recurring expenses to see where your money goes.
        </p>
        <Link href="/expenses" className="btn btn-primary">
          Add your first expense
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  const maxCategoryAmount = Math.max(...Object.values(data.categoryBreakdown), 1)
  const savingsPercentage = data.totalMonthly > 0 
    ? Math.round((data.potentialSavings / data.totalAnnual) * 100)
    : 0

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section — Big numbers */}
      <div className="relative overflow-hidden rounded-2xl hero-gradient text-white p-6 sm:p-8">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Your recurring money</span>
          </div>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight tabular-nums">
              {formatCurrency(data.totalMonthly)}
            </span>
            <span className="text-lg sm:text-xl text-white/50 font-medium">/month</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Annual</p>
              <p className="text-xl sm:text-2xl font-bold tabular-nums">{formatCurrency(data.totalAnnual)}</p>
              <p className="text-xs text-white/40">per year</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Expenses</p>
              <p className="text-xl sm:text-2xl font-bold">{data.totalExpenses}</p>
              <p className="text-xs text-white/40">recurring</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">12-month</p>
              <p className="text-xl sm:text-2xl font-bold tabular-nums">{formatCurrency(data.forecast.totalForecast)}</p>
              <p className="text-xs text-white/40">forecast</p>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/3 rounded-full" />
      </div>

      {/* LifeOS found — potential savings callout */}
      {data.potentialSavings > 0 && (
        <Link 
          href="/savings"
          className="group block relative overflow-hidden rounded-xl border-2 border-success/20 bg-success/5 p-5 transition-all hover:border-success/40 hover:bg-success/10"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-success" />
                <span className="text-xs font-semibold uppercase tracking-wider text-success">
                  LifeOS found
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-success tabular-nums">
                {formatCurrency(data.potentialSavings)}<span className="text-base font-medium text-success/70">/yr</span>
              </p>
              <p className="text-sm text-muted mt-1">
                worth of reviewing · {data.actions.length} action{data.actions.length !== 1 ? 's' : ''} available
              </p>
            </div>
            <div className="p-2 bg-success/10 rounded-lg group-hover:bg-success/20 transition-colors">
              <ArrowUpRight className="w-5 h-5 text-success" />
            </div>
          </div>
        </Link>
      )}

      {/* LifeOS Radar — What needs attention */}
      {data.actions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
                <Radar className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-semibold">LifeOS Radar</h2>
              <span className="text-xs text-muted">· {data.actions.length} thing{data.actions.length !== 1 ? 's' : ''} to review</span>
            </div>
            <Link href="/savings" className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {data.actions.slice(0, 4).map((action) => (
              <Link
                key={action.expenseId}
                href={`/expenses/${action.expenseId}`}
                className="group flex items-center justify-between p-3.5 bg-surface border border-border rounded-lg hover:border-foreground/20 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${
                    action.urgency === 'high' ? 'bg-destructive' :
                    action.urgency === 'medium' ? 'bg-warning' : 'bg-muted-light'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:underline">{action.expenseName}</p>
                    <p className="text-xs text-muted truncate">{action.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  {action.potentialSaving > 0 && (
                    <span className="text-sm font-bold text-success tabular-nums whitespace-nowrap">
                      +{formatCurrency(action.potentialSaving)}/yr
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Where your money goes — Visual category bars */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Where your money goes</h2>
          <Link href="/expenses" className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 sm:p-5">
          {Object.entries(data.categoryBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount]) => {
              const pct = (amount / maxCategoryAmount) * 100
              const barColor = CATEGORY_COLORS[category] || "#6B7280"
              return (
                <div key={category} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{CATEGORY_LABELS[category] || category}</span>
                    <span className="text-sm font-bold tabular-nums">{formatCurrency(amount)}<span className="text-xs font-normal text-muted">/mo</span></span>
                  </div>
                  <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              )
            })}
          {Object.keys(data.categoryBreakdown).length === 0 && (
            <div className="py-6 text-center text-sm text-muted">
              No expenses yet
            </div>
          )}
        </div>
      </section>

      {/* Two columns: Renewals + Expense Health */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming renewals */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Upcoming renewals</h2>
            <Link href="/calendar" className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1">
              Calendar <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {data.upcomingRenewals.slice(0, 5).map((expense) => {
              const renewalDate = new Date(expense.nextBillingDate!)
              const daysUntil = Math.ceil(
                (renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
              return (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="group flex items-center justify-between px-4 py-3 table-row"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      daysUntil <= 3 ? 'bg-destructive/10' :
                      daysUntil <= 7 ? 'bg-warning/10' : 'bg-surface-hover'
                    }`}>
                      <Calendar className={`w-4 h-4 ${
                        daysUntil <= 3 ? 'text-destructive' :
                        daysUntil <= 7 ? 'text-warning' : 'text-muted'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:underline">{expense.name}</p>
                      <p className="text-xs text-muted">
                        {renewalDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      daysUntil <= 3 ? 'bg-destructive/10 text-destructive' :
                      daysUntil <= 7 ? 'bg-warning/10 text-warning' :
                      'bg-surface-hover text-muted'
                    }`}>
                      {daysUntil <= 0 ? 'Today' : `${daysUntil}d`}
                    </span>
                    <span className="text-sm font-bold tabular-nums">
                      {formatCurrency(expense.normalizedMonthlyCost)}
                    </span>
                  </div>
                </Link>
              )
            })}
            {data.upcomingRenewals.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted">
                No upcoming renewals
              </div>
            )}
          </div>
        </section>

        {/* Expense Health */}
        <section>
          <h2 className="text-sm font-semibold mb-3">Expense health</h2>
          <div className="grid grid-cols-2 gap-3">
            <HealthCard
              label="Healthy"
              count={data.healthSummary.healthy}
              icon={<Shield className="w-4 h-4" />}
              color="success"
            />
            <HealthCard
              label="Review"
              count={data.healthSummary.review}
              icon={<AlertTriangle className="w-4 h-4" />}
              color="warning"
            />
            <HealthCard
              label="Unnecessary"
              count={data.healthSummary.unnecessary}
              icon={<Circle className="w-4 h-4" />}
              color="destructive"
            />
            <HealthCard
              label="Price up"
              count={data.healthSummary.price_increased}
              icon={<TrendingUp className="w-4 h-4" />}
              color="accent"
            />
            <HealthCard
              label="Renewal soon"
              count={data.healthSummary.renewal_soon}
              icon={<Clock className="w-4 h-4" />}
              color="info"
              className="col-span-2"
            />
          </div>
        </section>
      </div>

      {/* Future self comparison */}
      {data.potentialSavings > 0 && (
        <section className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Your future self</h2>
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="flex-1">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">If nothing changes</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(data.comparison.current12Month)}<span className="text-sm font-normal text-muted">/yr</span></p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-success" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">After top actions</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(data.comparison.forecastIfCompleted)}<span className="text-sm font-normal text-muted">/yr</span></p>
            </div>
            <div className="flex-shrink-0 hidden sm:block">
              <div className="px-3 py-1.5 bg-success/10 rounded-full">
                <span className="text-sm font-bold text-success tabular-nums">-{formatCurrency(data.comparison.savingsDifference)}/yr</span>
              </div>
            </div>
          </div>
          <div className="sm:hidden mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted">You could save</span>
              <span className="text-lg font-bold text-success tabular-nums">{formatCurrency(data.comparison.savingsDifference)}/yr</span>
            </div>
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/simulator" className="group bg-surface border border-border rounded-xl p-4 hover:border-foreground/20 hover:shadow-sm transition-all text-left">
            <div className="w-8 h-8 bg-surface-hover rounded-lg flex items-center justify-center mb-3 group-hover:bg-foreground/5 transition-colors">
              <DollarSign className="w-4 h-4 text-muted" />
            </div>
            <p className="text-sm font-semibold">Simulator</p>
            <p className="text-xs text-muted mt-0.5">Try what-if scenarios</p>
          </Link>
          <Link href="/calculator" className="group bg-surface border border-border rounded-xl p-4 hover:border-foreground/20 hover:shadow-sm transition-all text-left">
            <div className="w-8 h-8 bg-surface-hover rounded-lg flex items-center justify-center mb-3 group-hover:bg-foreground/5 transition-colors">
              <Target className="w-4 h-4 text-muted" />
            </div>
            <p className="text-sm font-semibold">Calculator</p>
            <p className="text-xs text-muted mt-0.5">Least-painful savings</p>
          </Link>
          <Link href="/commitments" className="group bg-surface border border-border rounded-xl p-4 hover:border-foreground/20 hover:shadow-sm transition-all text-left">
            <div className="w-8 h-8 bg-surface-hover rounded-lg flex items-center justify-center mb-3 group-hover:bg-foreground/5 transition-colors">
              <Calendar className="w-4 h-4 text-muted" />
            </div>
            <p className="text-sm font-semibold">Commitments</p>
            <p className="text-xs text-muted mt-0.5">12-month view</p>
          </Link>
          <Link href="/reports" className="group bg-surface border border-border rounded-xl p-4 hover:border-foreground/20 hover:shadow-sm transition-all text-left">
            <div className="w-8 h-8 bg-surface-hover rounded-lg flex items-center justify-center mb-3 group-hover:bg-foreground/5 transition-colors">
              <TrendingUp className="w-4 h-4 text-muted" />
            </div>
            <p className="text-sm font-semibold">Reports</p>
            <p className="text-xs text-muted mt-0.5">Spending trends</p>
          </Link>
        </div>
      </section>

      {/* Actual savings achieved */}
      {data.actualSavings.count > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3">Savings achieved</h2>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {formatCurrency(data.actualSavings.monthly)}/month saved
                </p>
                <p className="text-xs text-muted">
                  {formatCurrency(data.actualSavings.annual)}/year · {data.actualSavings.count} expense{data.actualSavings.count !== 1 ? 's' : ''} archived
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {data.totalExpenses === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <Radar className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Start tracking your spending</h3>
          <p className="text-muted mb-6 max-w-md mx-auto">
            Add your first recurring expenses to see where your money goes and find opportunities to save.
          </p>
          <Link href="/expenses" className="btn btn-primary">
            Add first expense
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

function HealthCard({
  label,
  count,
  icon,
  color,
  className = "",
}: {
  label: string
  count: number
  icon: React.ReactNode
  color: string
  className?: string
}) {
  const colorMap: Record<string, string> = {
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
    accent: "text-accent bg-accent/10",
    info: "text-info bg-info/10",
  }

  return (
    <div className={`bg-surface border border-border rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorMap[color] || 'text-muted bg-surface-hover'}`}>
          {icon}
        </div>
        <span className={`text-2xl font-bold tabular-nums ${colorMap[color]?.split(' ')[0] || 'text-foreground'}`}>
          {count}
        </span>
      </div>
      <p className="text-xs text-muted font-medium">{label}</p>
    </div>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
