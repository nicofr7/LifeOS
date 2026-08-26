"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"
import { ProFeatureGate } from "@/components/pro-feature-gate"
import {
  Calendar,
  TrendingUp,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface Expense {
  id: string
  name: string
  category: string
  monthlyCost: number
  billingFrequency: string
  nextBillingDate: string | null
  provider: string | null
}

interface MonthData {
  month: string
  shortMonth: string
  year: number
  monthIndex: number
  total: number
  baseMonthly: number
  extraPayments: Array<{
    expenseId: string
    expenseName: string
    category: string
    amount: number
    type: string
  }>
  hasExtraPayments: boolean
  isSpike: boolean
}

interface CommitmentData {
  months: MonthData[]
  totalAnnual: number
  averageMonthly: number
  largestMonth: { month: string; amount: number }
  smallestMonth: { month: string; amount: number }
  totalExtraPayments: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getMonthlyCost(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly":
      return amount * 4.33
    case "bi-weekly":
      return amount * 2.17
    case "monthly":
      return amount
    case "bimonthly":
      return amount / 2
    case "quarterly":
      return amount / 3
    case "semiannual":
      return amount / 6
    case "yearly":
      return amount / 12
    default:
      return amount
  }
}

function getBarColor(hasExtraPayments: boolean, isHighest: boolean): string {
  if (isHighest) return "#111827" // darkest for highest
  if (hasExtraPayments) return "#6B7280" // gray for spikes
  return "#D1D5DB" // light gray for normal months
}

export default function CommitmentsPage() {
  const [data, setData] = useState<CommitmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch("/api/expenses")
      if (res.ok) {
        const json = await res.json()
        const expenses: Expense[] = json.expenses || []
        const processed = processExpenses(expenses)
        setData(processed)
      }
    } catch (err) {
      console.error("Failed to load commitments:", err)
    } finally {
      setLoading(false)
    }
  }

  function processExpenses(expenses: Expense[]): CommitmentData {
    const now = new Date()
    const months: MonthData[] = []

    // Calculate base monthly cost (normalize all to monthly)
    const totalBaseMonthly = expenses.reduce(
      (sum, e) => sum + getMonthlyCost(e.monthlyCost, e.billingFrequency),
      0
    )

    // Generate 12 months
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthName = targetDate.toLocaleDateString("en-US", { month: "long" })
      const shortMonth = targetDate.toLocaleDateString("en-US", { month: "short" })
      const year = targetDate.getFullYear()
      const monthIndex = targetDate.getMonth()

      const extraPayments: MonthData["extraPayments"] = []

      // Check each expense for payments in this month
      for (const expense of expenses) {
        const monthlyEquivalent = getMonthlyCost(
          expense.monthlyCost,
          expense.billingFrequency
        )

        // For non-monthly billing, check if payment falls in this month
        if (
          expense.billingFrequency !== "monthly" &&
          expense.nextBillingDate
        ) {
          const nextBilling = new Date(expense.nextBillingDate)

          // Check if this expense has a payment in the target month
          const tempDate = new Date(nextBilling)
          while (tempDate < new Date(year, monthIndex + 1, 1)) {
            if (
              tempDate.getMonth() === monthIndex &&
              tempDate.getFullYear() === year
            ) {
              // This is the actual payment month - add the full amount
              extraPayments.push({
                expenseId: expense.id,
                expenseName: expense.name,
                category: expense.category,
                amount: expense.monthlyCost, // Full cycle amount
                type: expense.billingFrequency,
              })
              break
            }
            // Move to next billing cycle
            if (expense.billingFrequency === "quarterly")
              tempDate.setMonth(tempDate.getMonth() + 3)
            else if (expense.billingFrequency === "semiannual")
              tempDate.setMonth(tempDate.getMonth() + 6)
            else if (expense.billingFrequency === "yearly")
              tempDate.setFullYear(tempDate.getFullYear() + 1)
            else if (expense.billingFrequency === "weekly")
              tempDate.setDate(tempDate.getDate() + 7)
            else if (expense.billingFrequency === "bi-weekly")
              tempDate.setDate(tempDate.getDate() + 14)
            else if (expense.billingFrequency === "bimonthly")
              tempDate.setMonth(tempDate.getMonth() + 2)
            else break
          }
        }
      }

      const extraTotal = extraPayments.reduce((sum, p) => sum + p.amount, 0)
      const total = totalBaseMonthly + extraTotal

      months.push({
        month: monthName,
        shortMonth,
        year,
        monthIndex,
        total,
        baseMonthly: totalBaseMonthly,
        extraPayments,
        hasExtraPayments: extraPayments.length > 0,
        isSpike: extraPayments.length > 0,
      })
    }

    // Find stats
    const sortedByTotal = [...months].sort((a, b) => b.total - a.total)
    const largestMonth = sortedByTotal[0]
    const smallestMonth = sortedByTotal[sortedByTotal.length - 1]
    const totalExtraPayments = months.reduce(
      (sum, m) =>
        sum + m.extraPayments.reduce((s, p) => s + p.amount, 0),
      0
    )

    return {
      months,
      totalAnnual: months.reduce((sum, m) => sum + m.total, 0),
      averageMonthly: months.reduce((sum, m) => sum + m.total, 0) / 12,
      largestMonth: {
        month: largestMonth.shortMonth,
        amount: largestMonth.total,
      },
      smallestMonth: {
        month: smallestMonth.shortMonth,
        amount: smallestMonth.total,
      },
      totalExtraPayments,
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 text-foreground animate-spin" />
      </div>
    )
  }

  if (!data || data.months.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commitments</h1>
          <p className="text-sm text-muted mt-1">
            Your 12-month financial commitments
          </p>
        </div>
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6 text-muted" />
          </div>
          <h3 className="text-sm font-semibold mb-1">No expenses yet</h3>
          <p className="text-sm text-muted mb-4">
            Add expenses to see your 12-month commitment forecast.
          </p>
          <Link href="/expenses" className="btn btn-primary">
            Add first expense
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const maxTotal = Math.max(...data.months.map((m) => m.total))

  const chartData = data.months.map((m) => ({
    name: m.shortMonth,
    total: Math.round(m.total),
    base: Math.round(m.baseMonthly),
    extra: Math.round(m.extraPayments.reduce((s, p) => s + p.amount, 0)),
    hasExtra: m.hasExtraPayments,
    isHighest: m.total === maxTotal,
  }))

  return (
    <ProFeatureGate featureName="12-Month Commitment View" description="See your full year of financial commitments with monthly spikes for quarterly and annual payments.">
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commitments</h1>
        <p className="text-sm text-muted mt-1">
          Your 12-month financial commitments
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-md p-4">
          <p className="text-xs text-muted mb-1">12-month total</p>
          <p className="text-xl font-bold tabular-nums">
            {formatCurrency(data.totalAnnual)}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-md p-4">
          <p className="text-xs text-muted mb-1">Average monthly</p>
          <p className="text-xl font-bold tabular-nums">
            {formatCurrency(data.averageMonthly)}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-md p-4">
          <p className="text-xs text-muted mb-1">Highest month</p>
          <p className="text-xl font-bold tabular-nums">
            {formatCurrency(data.largestMonth.amount)}
          </p>
          <p className="text-xs text-muted">{data.largestMonth.month}</p>
        </div>
        <div className="bg-surface border border-border rounded-md p-4">
          <p className="text-xs text-muted mb-1">Extra payments</p>
          <p className="text-xl font-bold tabular-nums">
            {formatCurrency(data.totalExtraPayments)}
          </p>
          <p className="text-xs text-muted">quarterly + annual</p>
        </div>
      </div>

      {/* Bar chart */}
      <section className="bg-surface border border-border rounded-md p-4">
        <h2 className="text-sm font-semibold mb-4">Monthly commitment forecast</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E5E7EB"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#6B7280" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  if (!d) return null
                  return (
                    <div className="bg-foreground text-white px-3 py-2 rounded text-xs">
                      <p className="font-medium">{d.name}</p>
                      <p className="tabular-nums">${d.total.toLocaleString()}</p>
                      {d.extra > 0 && (
                        <p className="text-white/70">
                          includes +${d.extra.toLocaleString()} extra
                        </p>
                      )}
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="total"
                radius={[2, 2, 0, 0]}
                onClick={(_data, index) => {
                  const monthData = data.months[index]
                  if (monthData) setSelectedMonth(monthData)
                }}
                style={{ cursor: "pointer" }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.hasExtra, entry.isHighest)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-300 rounded" />
            Regular month
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded" />
            Includes extra payment
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-900 rounded" />
            Highest month
          </div>
        </div>
      </section>

      {/* Month detail (selected) */}
      {selectedMonth && (
        <section className="bg-surface border border-border rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">
              {selectedMonth.month} {selectedMonth.year}
            </h2>
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-xs text-muted hover:text-foreground"
            >
              Close
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted mb-1">Base monthly spending</p>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(selectedMonth.baseMonthly)}
              </p>
            </div>
            {selectedMonth.extraPayments.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-1">Extra payments this month</p>
                <p className="text-lg font-bold tabular-nums">
                  +{formatCurrency(
                    selectedMonth.extraPayments.reduce((s, p) => s + p.amount, 0)
                  )}
                </p>
              </div>
            )}
          </div>

          {selectedMonth.extraPayments.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted mb-2">
                Payments due this month
              </p>
              <div className="space-y-2">
                {selectedMonth.extraPayments.map((payment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{payment.expenseName}</p>
                      <p className="text-xs text-muted capitalize">
                        {payment.type.replace("_", " ")} payment
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm font-medium">Total this month</span>
            <span className="text-lg font-bold tabular-nums">
              {formatCurrency(selectedMonth.total)}
            </span>
          </div>
        </section>
      )}

      {/* Month list */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Month-by-month breakdown</h2>
        <div className="bg-surface border border-border rounded-md divide-y divide-border">
          {data.months.map((month, idx) => (
            <button
              key={idx}
              onClick={() =>
                setSelectedMonth(
                  selectedMonth?.monthIndex === month.monthIndex ? null : month
                )
              }
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-8 rounded-full ${
                    month.hasExtraPayments ? "bg-gray-500" : "bg-gray-200"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium">
                    {month.month} {month.year}
                  </p>
                  {month.extraPayments.length > 0 && (
                    <p className="text-xs text-muted">
                      {month.extraPayments.length} extra payment
                      {month.extraPayments.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium tabular-nums">
                  {formatCurrency(month.total)}
                </span>
                {selectedMonth?.monthIndex === month.monthIndex ? (
                  <ChevronUp className="w-4 h-4 text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted" />
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Insights */}
      <section className="bg-surface border border-border rounded-md p-4">
        <h2 className="text-sm font-semibold mb-3">Insights</h2>
        <div className="space-y-3 text-sm text-muted">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
            <p>
              Your highest month is{" "}
              <strong className="text-foreground">
                {data.largestMonth.month}
              </strong>{" "}
              at{" "}
              <strong className="text-foreground">
                {formatCurrency(data.largestMonth.amount)}
              </strong>
              . Plan ahead for large quarterly or annual payments.
            </p>
          </div>
          {data.totalExtraPayments > 0 && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
              <p>
                You have{" "}
                <strong className="text-foreground">
                  {formatCurrency(data.totalExtraPayments)}
                </strong>{" "}
                in extra payments (quarterly/annual) spread across the year.
              </p>
            </div>
          )}
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 flex items-center justify-center mt-0.5 flex-shrink-0">
              <span className="text-foreground text-xs">→</span>
            </div>
            <p>
              Consider switching to monthly billing if large spikes are
              difficult to manage, or build a buffer in lower months.
            </p>
          </div>
        </div>
      </section>
    </div>
    </ProFeatureGate>
  )
}
