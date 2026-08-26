"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addDays } from "date-fns"
import { calculateMonthlyCost, formatCurrency, roundMoney } from "@/lib/utils"

interface Expense {
  id: string
  name: string
  monthlyCost: number
  billingFrequency: string
  nextBillingDate: string | null
  provider: string | null
  category: string
}

export default function CalendarPage() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "week" | "month" | "quarter">("all")

  useEffect(() => {
    fetchExpenses()
  }, [])

  async function fetchExpenses() {
    try {
      const res = await fetch("/api/expenses")
      if (res.ok) {
        const data = await res.json()
        setExpenses(data.expenses.filter((e: Expense) => e.nextBillingDate))
      }
    } catch (err) {
      console.error("Failed to fetch expenses:", err)
    } finally {
      setLoading(false)
    }
  }

  function getNormalizedMonthlyCost(expense: Expense): number {
    return roundMoney(calculateMonthlyCost(expense.monthlyCost, expense.billingFrequency))
  }

  function getFilteredExpenses() {
    const now = new Date()
    const weekEnd = addDays(now, 7)
    const monthEnd = addMonths(now, 1)
    const quarterEnd = addMonths(now, 3)

    return expenses.filter((expense) => {
      if (!expense.nextBillingDate) return false
      const date = new Date(expense.nextBillingDate)

      switch (filter) {
        case "week":
          return date >= now && date <= weekEnd
        case "month":
          return date >= now && date <= monthEnd
        case "quarter":
          return date >= now && date <= quarterEnd
        default:
          return true
      }
    }).sort((a, b) => new Date(a.nextBillingDate!).getTime() - new Date(b.nextBillingDate!).getTime())
  }

  function getExpensesForDay(day: Date) {
    return expenses.filter((expense) => {
      if (!expense.nextBillingDate) return false
      return isSameDay(new Date(expense.nextBillingDate), day)
    })
  }

  const filteredExpenses = getFilteredExpenses()
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const totalMonthlyCost = filteredExpenses.reduce(
    (sum, e) => sum + getNormalizedMonthlyCost(e),
    0
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Renewal Calendar</h1>
        <p className="text-sm text-muted mt-1">Track upcoming recurring charges</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { id: "all", label: "All" },
          { id: "week", label: "This Week" },
          { id: "month", label: "This Month" },
          { id: "quarter", label: "Next 3 Months" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={`btn text-sm ${filter === f.id ? "btn-primary" : "btn-outline"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="btn btn-ghost p-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="btn btn-ghost p-2"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((day, idx) => {
              const dayExpenses = getExpensesForDay(day)
              const isCurrentDay = isToday(day)

              return (
                <div
                  key={idx}
                  className={`min-h-[72px] p-1.5 rounded-lg border cursor-pointer transition-colors ${
                    isCurrentDay
                      ? "border-foreground/30 bg-foreground/5"
                      : "border-transparent hover:bg-surface-hover"
                  }`}
                >
                  <div
                    className={`text-xs font-medium mb-1 ${
                      isCurrentDay ? "text-foreground font-bold" : "text-muted"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayExpenses.slice(0, 2).map((expense) => (
                      <div
                        key={expense.id}
                        className="text-[10px] bg-foreground/10 text-foreground px-1 py-0.5 rounded truncate cursor-pointer hover:bg-foreground/20"
                        onClick={() => router.push(`/expenses/${expense.id}`)}
                      >
                        {expense.name}
                      </div>
                    ))}
                    {dayExpenses.length > 2 && (
                      <div className="text-[10px] text-muted">
                        +{dayExpenses.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming list */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Upcoming Charges</h3>
            <div className="mb-4 p-3 bg-surface-hover rounded-lg">
              <p className="text-xs text-muted">Total upcoming</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(totalMonthlyCost)}</p>
            </div>
            {filteredExpenses.length > 0 ? (
              <div className="space-y-2">
                {filteredExpenses.map((expense) => {
                  const renewalDate = new Date(expense.nextBillingDate!)
                  const daysUntil = Math.ceil(
                    (renewalDate.getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                  const isUrgent = daysUntil <= 3
                  const normalizedCost = getNormalizedMonthlyCost(expense)

                  return (
                    <div
                      key={expense.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-surface-hover transition-colors ${
                        isUrgent ? "bg-warning/5 border border-warning/20" : ""
                      }`}
                      onClick={() => router.push(`/expenses/${expense.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{expense.name}</p>
                        <p className="text-xs text-muted">
                          {format(renewalDate, "MMM d")}
                          {isUrgent && (
                            <span className="ml-1.5 text-warning font-medium">
                              {daysUntil === 0 ? "Today" : `${daysUntil}d`}
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(normalizedCost)}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted text-sm text-center py-4">
                No upcoming renewals
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Summary</h3>
            <div className="space-y-3">
              {[
                { label: "This week", filterFn: (e: Expense) => {
                  const d = new Date(e.nextBillingDate!)
                  const now = new Date()
                  return d >= now && d <= addDays(now, 7)
                }},
                { label: "This month", filterFn: (e: Expense) => {
                  const d = new Date(e.nextBillingDate!)
                  const now = new Date()
                  return d >= now && d <= addMonths(now, 1)
                }},
                { label: "Next 3 months", filterFn: (e: Expense) => {
                  const d = new Date(e.nextBillingDate!)
                  const now = new Date()
                  return d >= now && d <= addMonths(now, 3)
                }},
              ].map(({ label, filterFn }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted">{label}</span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCurrency(
                      expenses
                        .filter((e) => e.nextBillingDate && filterFn(e))
                        .reduce((sum, e) => sum + getNormalizedMonthlyCost(e), 0)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
