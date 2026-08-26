"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  History,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function getMonthName(month: number): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  return months[month - 1]
}

function getMonthFullName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  return months[month - 1]
}

const CATEGORY_COLORS: Record<string, string> = {
  entertainment: "#F59E0B",
  utilities: "#3B82F6",
  insurance: "#10B981",
  transportation: "#8B5CF6",
  food: "#EF4444",
  software: "#6366F1",
  health_fitness: "#EC4899",
  shopping: "#F97316",
  education: "#14B8A6",
  other: "#64748B",
}

interface SnapshotData {
  year: number
  month: number
  totalMonthly: number
  totalAnnual: number
  expenseCount: number
  potentialSavings: number
  categoryBreakdown: Record<string, number>
  biggestChanges: { name: string; change: number; previousMonthly: number; currentMonthly: number }[]
}

interface TrendPoint {
  year: number
  month: number
  totalMonthly: number
  totalAnnual: number
  expenseCount: number
  potentialSavings: number
}

interface ReportData {
  currentMonth: SnapshotData
  previousMonth: SnapshotData | null
  comparison: {
    monthlyChange: number | null
    annualChange: number | null
    expenseCountChange: number | null
  }
  actionItems: { title: string; description: string; potentialSaving: number; priority: string }[]
  goalProgress: { name: string; targetAmount: number; currentAmount: number; percentage: number }[]
  trend?: TrendPoint[]
}

export default function ReportsPage() {
  const router = useRouter()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillDone, setBackfillDone] = useState(false)
  const [currentDate, setCurrentDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  })

  useEffect(() => {
    fetchReport()
  }, [currentDate])

  async function fetchReport() {
    try {
      const params = new URLSearchParams({
        year: String(currentDate.year),
        month: String(currentDate.month),
        trend: "true",
      })
      const res = await fetch(`/api/reports?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error("Failed to fetch report:", err)
    } finally {
      setLoading(false)
    }
  }

  async function refreshReport() {
    setRefreshing(true)
    try {
      await fetch("/api/reports", { method: "POST" })
      await fetchReport()
    } catch (err) {
      console.error("Failed to refresh report:", err)
    } finally {
      setRefreshing(false)
    }
  }

  async function backfillHistory() {
    setBackfilling(true)
    try {
      const res = await fetch("/api/reports", { method: "POST" })
      const json = await res.json()
      setBackfillDone(true)
      await fetchReport()
    } catch (err) {
      console.error("Failed to backfill:", err)
    } finally {
      setBackfilling(false)
    }
  }

  function navigateMonth(direction: number) {
    setCurrentDate(prev => {
      let newMonth = prev.month + direction
      let newYear = prev.year
      if (newMonth < 1) { newMonth = 12; newYear -= 1 }
      else if (newMonth > 12) { newMonth = 1; newYear += 1 }
      return { year: newYear, month: newMonth }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Failed to load report</p>
        <button onClick={fetchReport} className="btn btn-primary mt-4">Retry</button>
      </div>
    )
  }

  const { currentMonth, previousMonth, comparison, actionItems, goalProgress, trend } = data
  const hasPreviousData = previousMonth !== null
  const hasTrend = trend && trend.length > 1

  // Prepare chart data
  const chartData = trend?.map(t => ({
    name: `${getMonthName(t.month)} ${t.year}`,
    shortName: getMonthName(t.month),
    spending: t.totalMonthly,
    savings: t.potentialSavings,
    expenses: t.expenseCount,
    month: t.month,
    year: t.year,
  })) || []

  // Prepare category breakdown
  const pieData = Object.entries(currentMonth.categoryBreakdown)
    .map(([category, amount]) => ({
      name: category.replace("_", " "),
      value: amount,
      color: CATEGORY_COLORS[category] || "#64748B",
    }))
    .sort((a, b) => b.value - a.value)

  // Calculate trend stats
  let trendStats = null
  if (hasTrend && trend) {
    const first = trend[0]
    const last = trend[trend.length - 1]
    const spendingChange = last.totalMonthly - first.totalMonthly
    const spendingChangePct = first.totalMonthly > 0
      ? ((spendingChange / first.totalMonthly) * 100).toFixed(1)
      : "0"
    const expenseChange = last.expenseCount - first.expenseCount
    trendStats = {
      period: `${getMonthName(first.month)} ${first.year} — ${getMonthName(last.month)} ${last.year}`,
      months: trend.length,
      spendingChange,
      spendingChangePct,
      expenseChange,
      avgMonthly: (trend.reduce((s, t) => s + t.totalMonthly, 0) / trend.length).toFixed(0),
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Monthly Insights</h1>
          <p className="text-muted mt-1">Your spending summary and action items</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="btn btn-ghost p-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold min-w-[140px] text-center">
            {getMonthFullName(currentDate.month)} {currentDate.year}
          </span>
          <button onClick={() => navigateMonth(1)} className="btn btn-ghost p-2">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={refreshReport} disabled={refreshing} className="btn btn-primary">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Spending Trend Chart */}
      {hasTrend && chartData.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Spending Trend</h2>
              <p className="text-sm text-muted mt-0.5">{trendStats?.period} · {trendStats?.months} months</p>
            </div>
            {trendStats && (
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  {trendStats.spendingChange > 0 ? (
                    <TrendingUp className="w-4 h-4 text-destructive" />
                  ) : trendStats.spendingChange < 0 ? (
                    <TrendingDown className="w-4 h-4 text-success" />
                  ) : (
                    <Minus className="w-4 h-4 text-muted" />
                  )}
                  <span className={`text-sm font-semibold ${trendStats.spendingChange > 0 ? "text-destructive" : trendStats.spendingChange < 0 ? "text-success" : "text-muted"}`}>
                    {trendStats.spendingChange > 0 ? "+" : ""}{formatCurrency(trendStats.spendingChange)}/mo
                  </span>
                </div>
                <p className="text-xs text-muted">{trendStats.spendingChangePct}% over {trendStats.months} months</p>
              </div>
            )}
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#111827" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#111827" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "12px",
                    padding: "8px 12px",
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), "Monthly Spending"]}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="spending"
                  stroke="#111827"
                  strokeWidth={2}
                  fill="url(#spendingGradient)"
                  dot={{ fill: "#111827", r: 3 }}
                  activeDot={{ r: 5, fill: "#111827" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Trend summary stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted">Avg. monthly</p>
              <p className="text-sm font-semibold tabular-nums">${trendStats?.avgMonthly}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Expense count change</p>
              <p className="text-sm font-semibold tabular-nums">
                {trendStats && trendStats.expenseChange > 0 ? "+" : ""}
                {trendStats?.expenseChange}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Months tracked</p>
              <p className="text-sm font-semibold tabular-nums">{trendStats?.months}</p>
            </div>
          </div>
        </div>
      )}

      {/* Backfill prompt for new users */}
      {!hasTrend && currentMonth.expenseCount > 0 && (
        <div className="card border-info/20 bg-info/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-info flex-shrink-0" />
              <div>
                <p className="font-medium">Build your spending history</p>
                <p className="text-sm text-muted">
                  Generate historical snapshots to see trends and month-over-month comparisons.
                </p>
              </div>
            </div>
            <button
              onClick={backfillHistory}
              disabled={backfilling}
              className="btn btn-primary text-sm flex-shrink-0"
            >
              {backfilling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <History className="w-4 h-4" />
              )}
              Generate history
            </button>
          </div>
          {backfillDone && (
            <p className="text-sm text-success mt-2">History generated! Scroll up to see your trend.</p>
          )}
        </div>
      )}

      {/* Main metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted">Monthly Spending</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(currentMonth.totalMonthly)}</p>
              {hasPreviousData && comparison.monthlyChange !== null && (
                <div className="flex items-center gap-1 text-sm">
                  {comparison.monthlyChange > 0 ? (
                    <TrendingUp className="w-4 h-4 text-destructive" />
                  ) : comparison.monthlyChange < 0 ? (
                    <TrendingDown className="w-4 h-4 text-success" />
                  ) : (
                    <Minus className="w-4 h-4 text-muted" />
                  )}
                  <span className={comparison.monthlyChange > 0 ? "text-destructive" : comparison.monthlyChange < 0 ? "text-success" : "text-muted"}>
                    {comparison.monthlyChange > 0 ? "+" : ""}{formatCurrency(comparison.monthlyChange)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted">Annual Equivalent</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(currentMonth.totalAnnual)}</p>
              {hasPreviousData && comparison.annualChange !== null && (
                <div className="flex items-center gap-1 text-sm">
                  {comparison.annualChange > 0 ? (
                    <TrendingUp className="w-4 h-4 text-destructive" />
                  ) : comparison.annualChange < 0 ? (
                    <TrendingDown className="w-4 h-4 text-success" />
                  ) : (
                    <Minus className="w-4 h-4 text-muted" />
                  )}
                  <span className={comparison.annualChange > 0 ? "text-destructive" : comparison.annualChange < 0 ? "text-success" : "text-muted"}>
                    {comparison.annualChange > 0 ? "+" : ""}{formatCurrency(comparison.annualChange)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted">Potential Savings</p>
              <p className="text-2xl font-bold text-success tabular-nums">{formatCurrency(currentMonth.potentialSavings)}/yr</p>
              <p className="text-xs text-muted">{currentMonth.expenseCount} recurring expenses</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted">Expenses</p>
              <p className="text-2xl font-bold tabular-nums">{currentMonth.expenseCount}</p>
              {hasPreviousData && comparison.expenseCountChange !== null && comparison.expenseCountChange !== 0 && (
                <p className="text-xs text-muted">
                  {comparison.expenseCountChange > 0 ? "+" : ""}{comparison.expenseCountChange} from last month
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Month-over-month comparison */}
      {hasPreviousData && (
        <div className="card">
          <h2 className="font-semibold mb-4">Month-over-Month Comparison</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted mb-2">Previous Month</p>
              <p className="text-xl font-bold">{getMonthFullName(previousMonth!.month)}</p>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Monthly spending</span>
                  <span className="font-medium tabular-nums">{formatCurrency(previousMonth!.totalMonthly)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Expenses</span>
                  <span className="font-medium">{previousMonth!.expenseCount}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted mb-2">Current Month</p>
              <p className="text-xl font-bold">{getMonthFullName(currentMonth.month)}</p>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Monthly spending</span>
                  <span className="font-medium tabular-nums">{formatCurrency(currentMonth.totalMonthly)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Expenses</span>
                  <span className="font-medium">{currentMonth.expenseCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Biggest changes */}
      {currentMonth.biggestChanges.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Biggest Price Changes</h2>
          <div className="space-y-3">
            {currentMonth.biggestChanges.map((change, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  change.change > 0 ? "bg-warning/5 border border-warning/20" : "bg-success/5 border border-success/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  {change.change > 0 ? (
                    <TrendingUp className="w-5 h-5 text-warning" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-success" />
                  )}
                  <div>
                    <p className="font-medium">{change.name}</p>
                    <p className="text-sm text-muted">
                      {formatCurrency(change.previousMonthly)} → {formatCurrency(change.currentMonthly)}/mo
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold tabular-nums ${change.change > 0 ? "text-warning" : "text-success"}`}>
                    {change.change > 0 ? "+" : ""}{formatCurrency(change.change)}/mo
                  </p>
                  <p className="text-xs text-muted tabular-nums">{formatCurrency(change.change * 12)}/yr</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="card">
          <h2 className="font-semibold mb-4">Spending by Category</h2>
          {pieData.length > 0 ? (
            <div className="space-y-3">
              {pieData.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="capitalize text-sm">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-sm tabular-nums">{formatCurrency(item.value)}</span>
                      <span className="text-muted text-xs ml-2">
                        ({currentMonth.totalMonthly > 0 ? ((item.value / currentMonth.totalMonthly) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: item.color,
                        width: `${currentMonth.totalMonthly > 0 ? (item.value / currentMonth.totalMonthly) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm text-center py-4">No spending data</p>
          )}
        </div>

        {/* Action items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Top Action Items</h2>
            <button onClick={() => router.push("/savings")} className="text-sm text-primary hover:underline">
              View all
            </button>
          </div>
          {actionItems.length > 0 ? (
            <div className="space-y-3">
              {actionItems.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    item.priority === "high" ? "border-warning/20 bg-warning/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <span className={`badge text-xs ${
                          item.priority === "high" ? "badge-destructive" :
                          item.priority === "medium" ? "badge-warning" : "badge-primary"
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted line-clamp-2">{item.description}</p>
                    </div>
                    {item.potentialSaving > 0 && (
                      <span className="text-sm font-medium text-success whitespace-nowrap tabular-nums">
                        {formatCurrency(item.potentialSaving)}/yr
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
              <p className="text-muted text-sm">Nothing needs your attention right now.</p>
            </div>
          )}
        </div>
      </div>

      {/* Goals progress */}
      {goalProgress.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Savings Goals Progress</h2>
            <button onClick={() => router.push("/goals")} className="text-sm text-primary hover:underline">
              View all
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goalProgress.map((goal, idx) => (
              <div key={idx} className="p-4 bg-surface-hover rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium truncate">{goal.name}</p>
                  <span className="text-sm font-medium tabular-nums">{goal.percentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-border rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      goal.percentage >= 100 ? "bg-success" : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, goal.percentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted tabular-nums">
                  <span>{formatCurrency(goal.currentAmount)}</span>
                  <span>{formatCurrency(goal.targetAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasPreviousData && currentMonth.expenseCount === 0 && (
        <div className="card text-center py-8">
          <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No spending data yet</h3>
          <p className="text-muted text-sm mb-4">Add your first expenses to start tracking your monthly insights.</p>
          <button onClick={() => router.push("/expenses?action=add")} className="btn btn-primary">
            Add Expenses
          </button>
        </div>
      )}
    </div>
  )
}
