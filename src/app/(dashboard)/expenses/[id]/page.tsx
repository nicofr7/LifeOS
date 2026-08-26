"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  Clock,
  Activity,
  Target,
  Zap,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { EXPENSE_CATEGORIES, USAGE_STATUSES, CANCELLATION_DIFFICULTIES, BILLING_FREQUENCIES, calculateMonthlyCost, roundMoney } from "@/lib/utils"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

interface Expense {
  id: string
  name: string
  category: string
  monthlyCost: number
  billingFrequency: string
  annualCost: number
  nextBillingDate: string | null
  provider: string | null
  website: string | null
  notes: string | null
  isEssential: boolean
  usageStatus: string
  cancellationDifficulty: string
  isArchived: boolean
  createdAt: string
  priceHistory: { id: string; price: number; date: string; notes: string | null }[]
  recommendations: { id: string; type: string; reason: string; estimatedSaving: number; difficulty: string; confidence?: string; isActive: boolean }[]
}

// === EXPENSE DNA ===
function getExpenseDNA(expense: Expense) {
  const now = new Date()
  const created = new Date(expense.createdAt)
  const daysSinceCreated = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

  // Age
  let age = "New"
  let ageColor = "text-info"
  if (daysSinceCreated > 365) { age = "Veteran"; ageColor = "text-muted" }
  else if (daysSinceCreated > 180) { age = "Established"; ageColor = "text-foreground" }
  else if (daysSinceCreated > 90) { age = "Mature"; ageColor = "text-foreground" }
  else if (daysSinceCreated > 30) { age = "Growing"; ageColor = "text-foreground" }

  // Price volatility
  let volatility = "Stable"
  let volatilityColor = "text-success"
  if (expense.priceHistory.length >= 2) {
    const latest = expense.priceHistory[0].price
    const previous = expense.priceHistory[1].price
    const changePercent = Math.abs(((latest - previous) / previous) * 100)
    if (changePercent > 20) { volatility = "Volatile"; volatilityColor = "text-destructive" }
    else if (changePercent > 10) { volatility = "Increasing"; volatilityColor = "text-warning" }
  }

  // Usage pattern
  let usage = "Active"
  let usageColor = "text-success"
  if (expense.usageStatus === "dont_use") { usage = "Unused"; usageColor = "text-destructive" }
  else if (expense.usageStatus === "rarely_used") { usage = "Fading"; usageColor = "text-warning" }

  // Essentiality score (0-100)
  let essentialityScore = 50
  if (expense.isEssential) essentialityScore += 30
  if (expense.usageStatus === "active") essentialityScore += 20
  if (expense.usageStatus === "dont_use") essentialityScore -= 40
  if (expense.usageStatus === "rarely_used") essentialityScore -= 20
  essentialityScore = Math.max(0, Math.min(100, essentialityScore))

  return { age, ageColor, daysSinceCreated, volatility, volatilityColor, usage, usageColor, essentialityScore }
}

// === HEALTH STATUS ===
function getHealthStatus(expense: Expense) {
  const now = new Date()

  if (expense.usageStatus === "dont_use") {
    return { status: "Unnecessary", color: "destructive", icon: XCircle, description: "You're not using this but still paying." }
  }

  if (expense.usageStatus === "rarely_used") {
    return { status: "Review", color: "warning", icon: AlertTriangle, description: "Rarely used. Consider if you still need this." }
  }

  if (expense.priceHistory.length >= 2) {
    const latest = expense.priceHistory[0].price
    const previous = expense.priceHistory[1].price
    if (latest > previous * 1.1) {
      return { status: "Price Increased", color: "accent", icon: TrendingUp, description: `Price went up ${((latest - previous) / previous * 100).toFixed(0)}%` }
    }
  }

  if (expense.nextBillingDate) {
    const renewal = new Date(expense.nextBillingDate)
    const daysUntil = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil <= 7 && daysUntil >= 0) {
      return { status: "Renewal Soon", color: "info", icon: Clock, description: `Renews in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}` }
    }
  }

  return { status: "Healthy", color: "success", icon: CheckCircle, description: "No issues detected." }
}

// === NEGOTIATION SCRIPTS ===
function getNegotiationScripts(expense: Expense) {
  const scripts: Array<{ title: string; script: string; tips: string[] }> = []

  // Loyalty discount
  scripts.push({
    title: "Request Loyalty Discount",
    script: `Hi, I've been a customer for a while and I'm reviewing my recurring expenses. I'd like to ask about any loyalty discounts or retention offers available for my account. Is there anything you can do to help me keep my costs down?`,
    tips: [
      "Call during business hours",
      "Be polite but firm",
      "Mention you're considering canceling",
      "Ask for the retention department",
    ],
  })

  // Price increase challenge
  if (expense.priceHistory.length >= 2) {
    const latest = expense.priceHistory[0].price
    const previous = expense.priceHistory[1].price
    if (latest > previous) {
      scripts.push({
        title: "Challenge Price Increase",
        script: `Hi, I noticed my recent bill shows a price increase from ${formatCurrency(previous)} to ${formatCurrency(latest)}. I'd like to understand why this happened and whether there are any options to keep my rate at the previous level.`,
        tips: [
          "Reference the specific price change",
          "Ask for a supervisor if needed",
          "Mention competitor pricing",
          "Be ready to cancel if needed",
        ],
      })
    }
  }

  // Plan downgrade
  scripts.push({
    title: "Request Plan Downgrade",
    script: `Hi, I'd like to downgrade my current plan. I'm not using all the features and would prefer a more basic option that better fits my needs. What lower-tier plans are available?`,
    tips: [
      "Know what features you actually use",
      "Ask about basic or starter plans",
      "Check if there are usage-based options",
    ],
  })

  // Competitor match
  scripts.push({
    title: "Competitor Price Match",
    script: `Hi, I'm comparing prices and I found a similar service for less. I'd like to stay with you, but I need to make sure I'm getting the best value. Can you match or beat the competitor's price?`,
    tips: [
      "Research competitor prices first",
      "Get quotes in writing if possible",
      "Be prepared to actually switch",
    ],
  })

  return scripts
}

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddPrice, setShowAddPrice] = useState(false)
  const [newPrice, setNewPrice] = useState("")
  const [newPriceNotes, setNewPriceNotes] = useState("")
  const [priceLoading, setPriceLoading] = useState(false)
  const [showScripts, setShowScripts] = useState(false)
  const [decision, setDecision] = useState<string | null>(null)
  const [updatingDecision, setUpdatingDecision] = useState(false)

  useEffect(() => {
    fetchExpense()
  }, [id])

  async function fetchExpense() {
    try {
      const res = await fetch(`/api/expenses/${id}`)
      if (res.ok) {
        const data = await res.json()
        setExpense(data.expense)
        if (data.expense?.preferences?.[0]) {
          setDecision(data.expense.preferences[0].preference)
        }
      } else {
        router.push("/expenses")
      }
    } catch {
      router.push("/expenses")
    } finally {
      setLoading(false)
    }
  }

  async function addPriceHistory() {
    if (!newPrice || parseFloat(newPrice) <= 0) return
    setPriceLoading(true)
    try {
      const res = await fetch(`/api/expenses/${id}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: parseFloat(newPrice), notes: newPriceNotes || null }),
      })
      if (res.ok) {
        setNewPrice("")
        setNewPriceNotes("")
        setShowAddPrice(false)
        fetchExpense()
      }
    } finally {
      setPriceLoading(false)
    }
  }

  async function deleteExpense() {
    if (!confirm("Are you sure you want to delete this expense?")) return
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    if (res.ok) router.push("/expenses")
  }

  async function makeDecision(pref: string) {
    setUpdatingDecision(true)
    try {
      const res = await fetch(`/api/expenses/${id}/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference: pref }),
      })
      if (res.ok) setDecision(pref)
    } finally {
      setUpdatingDecision(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 text-foreground animate-spin" />
      </div>
    )
  }

  if (!expense) return null

  const normalizedMonthly = roundMoney(calculateMonthlyCost(expense.monthlyCost, expense.billingFrequency))
  const normalizedAnnual = roundMoney(normalizedMonthly * 12)
  const dna = getExpenseDNA(expense)
  const health = getHealthStatus(expense)
  const scripts = getNegotiationScripts(expense)
  const frequency = BILLING_FREQUENCIES.find((f) => f.id === expense.billingFrequency)
  const HealthIcon = health.icon

  // Price history data
  const chartData = [...expense.priceHistory].reverse().map((ph) => ({
    date: formatShortDate(ph.date),
    price: ph.price,
  }))

  // Price change info
  const priceIncrease =
    expense.priceHistory.length >= 2
      ? expense.priceHistory[0].price - expense.priceHistory[1].price
      : 0
  const priceIncreasePercent =
    expense.priceHistory.length >= 2 && expense.priceHistory[1].price > 0
      ? ((priceIncrease / expense.priceHistory[1].price) * 100).toFixed(0)
      : "0"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/expenses")}
          className="p-1.5 text-muted hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{expense.name}</h1>
            {expense.isArchived && (
              <span className="badge badge-primary text-xs">archived</span>
            )}
          </div>
          <p className="text-sm text-muted">
            {expense.provider || EXPENSE_CATEGORIES.find((c) => c.id === expense.category)?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {expense.website && (
            <a
              href={expense.website.startsWith("http") ? expense.website : `https://${expense.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-muted hover:text-foreground"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button onClick={deleteExpense} className="p-1.5 text-muted hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Decision buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => makeDecision("keep")}
          disabled={updatingDecision}
          className={`flex-1 py-3 rounded-md text-sm font-medium transition-colors ${
            decision === "keep"
              ? "bg-success text-white"
              : "bg-surface border border-border text-foreground hover:border-success"
          }`}
        >
          <CheckCircle className="w-4 h-4 inline mr-1.5" />
          Keep
        </button>
        <button
          onClick={() => makeDecision("ignore_recommendation")}
          disabled={updatingDecision}
          className={`flex-1 py-3 rounded-md text-sm font-medium transition-colors ${
            decision === "ignore_recommendation"
              ? "bg-warning text-white"
              : "bg-surface border border-border text-foreground hover:border-warning"
          }`}
        >
          <AlertTriangle className="w-4 h-4 inline mr-1.5" />
          Review Later
        </button>
        <button
          onClick={() => makeDecision("dont_suggest_again")}
          disabled={updatingDecision}
          className={`flex-1 py-3 rounded-md text-sm font-medium transition-colors ${
            decision === "dont_suggest_again"
              ? "bg-destructive text-white"
              : "bg-surface border border-border text-foreground hover:border-destructive"
          }`}
        >
          <XCircle className="w-4 h-4 inline mr-1.5" />
          Remove
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cost overview */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted mb-1">You pay</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(expense.monthlyCost)}</p>
                <p className="text-xs text-muted">per {frequency?.name?.toLowerCase() || expense.billingFrequency}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Monthly equivalent</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(normalizedMonthly)}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Annual equivalent</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(normalizedAnnual)}</p>
              </div>
            </div>
          </div>

          {/* Expense DNA */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" />
              <h2 className="text-sm font-semibold">Expense DNA</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted mb-1">Age</p>
                <p className={`text-sm font-medium ${dna.ageColor}`}>{dna.age}</p>
                <p className="text-xs text-muted">{dna.daysSinceCreated} days</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Price trend</p>
                <p className={`text-sm font-medium ${dna.volatilityColor}`}>{dna.volatility}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Usage</p>
                <p className={`text-sm font-medium ${dna.usageColor}`}>{dna.usage}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Essentiality</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-surface-hover rounded-full h-1.5">
                    <div
                      className="bg-foreground rounded-full h-1.5"
                      style={{ width: `${dna.essentialityScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{dna.essentialityScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Price History Timeline */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <h2 className="text-sm font-semibold">Price History</h2>
              </div>
              <button onClick={() => setShowAddPrice(true)} className="btn btn-outline text-xs">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {expense.priceHistory.length >= 2 && priceIncrease > 0 && (
              <div className="mb-4 p-3 bg-warning-light border border-warning/20 rounded-md flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-warning" />
                <span className="text-sm">
                  Price increased by {formatCurrency(priceIncrease)} ({priceIncreasePercent}%)
                </span>
              </div>
            )}

            {chartData.length > 0 ? (
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="bg-foreground text-white px-2 py-1 rounded text-xs">
                            {formatCurrency(Number(payload[0].value))}
                          </div>
                        )
                      }}
                    />
                    <Line type="monotone" dataKey="price" stroke="#111827" strokeWidth={2} dot={{ fill: "#111827", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-6">
                No price history yet. Add a price entry to track changes.
              </p>
            )}

            {/* Timeline */}
            {expense.priceHistory.length > 0 && (
              <div className="space-y-0">
                {expense.priceHistory.map((ph, idx) => (
                  <div key={ph.id} className="flex items-start gap-3 relative">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-foreground" : "bg-border-dark"}`} />
                      {idx < expense.priceHistory.length - 1 && (
                        <div className="w-px h-8 bg-border" />
                      )}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium tabular-nums">{formatCurrency(ph.price)}</span>
                        {idx > 0 && (
                          <span className={`text-xs ${ph.price > expense.priceHistory[idx - 1].price ? "text-destructive" : "text-success"}`}>
                            {ph.price > expense.priceHistory[idx - 1].price ? "+" : ""}
                            {formatCurrency(ph.price - expense.priceHistory[idx - 1].price)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted">{formatDate(ph.date)}</p>
                      {ph.notes && <p className="text-xs text-muted mt-0.5">{ph.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add price form */}
            {showAddPrice && (
              <div className="mt-4 p-3 bg-surface-hover rounded-md space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="input flex-1 text-sm"
                    placeholder="New price"
                  />
                  <input
                    type="text"
                    value={newPriceNotes}
                    onChange={(e) => setNewPriceNotes(e.target.value)}
                    className="input flex-1 text-sm"
                    placeholder="Notes (optional)"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddPrice(false)} className="btn btn-ghost text-xs">Cancel</button>
                  <button onClick={addPriceHistory} disabled={priceLoading || !newPrice} className="btn btn-primary text-xs">
                    {priceLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="bg-surface border border-border rounded-md p-4">
              <h2 className="text-sm font-semibold mb-2">Notes</h2>
              <p className="text-sm text-muted">{expense.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Health status */}
          <div className={`bg-surface border rounded-md p-4 border-l-2 border-l-${health.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <HealthIcon className={`w-4 h-4 text-${health.color}`} />
              <h2 className="text-sm font-semibold">{health.status}</h2>
            </div>
            <p className="text-sm text-muted">{health.description}</p>
          </div>

          {/* Quick stats */}
          <div className="bg-surface border border-border rounded-md p-4">
            <h2 className="text-sm font-semibold mb-3">Details</h2>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Category</span>
                <span className="capitalize">{expense.category.replace("_", " ")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Billing</span>
                <span>{frequency?.name || expense.billingFrequency}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Next renewal</span>
                <span>{expense.nextBillingDate ? formatDate(expense.nextBillingDate) : "Not set"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Essential</span>
                <span>{expense.isEssential ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Cancel difficulty</span>
                <span className="capitalize">{expense.cancellationDifficulty}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Added</span>
                <span>{formatDate(expense.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {expense.recommendations.length > 0 && (
            <div className="bg-surface border border-border rounded-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4" />
                <h2 className="text-sm font-semibold">Recommendations</h2>
              </div>
              <div className="space-y-3">
                {expense.recommendations.map((rec) => (
                  <div key={rec.id} className="p-3 bg-surface-hover rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium capitalize">{rec.type.replace("_", " ")}</span>
                      <span className={`badge text-xs ${
                        rec.confidence === "high" ? "badge-success" : "badge-warning"
                      }`}>
                        {rec.confidence || "medium"}
                      </span>
                    </div>
                    <p className="text-xs text-muted mb-2">{rec.reason}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-success">
                        Save {formatCurrency(rec.estimatedSaving)}/yr
                      </span>
                      <span className={`badge text-xs ${
                        rec.difficulty === "easy" ? "badge-success" : "badge-warning"
                      }`}>
                        {rec.difficulty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Negotiation scripts */}
          <div className="bg-surface border border-border rounded-md p-4">
            <button
              onClick={() => setShowScripts(!showScripts)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <h2 className="text-sm font-semibold">Negotiation Scripts</h2>
              </div>
              <span className="text-xs text-muted">{scripts.length} scripts</span>
            </button>
            {showScripts && (
              <div className="mt-4 space-y-4">
                {scripts.map((script, idx) => (
                  <div key={idx} className="p-3 bg-surface-hover rounded-md">
                    <h3 className="text-xs font-medium mb-2">{script.title}</h3>
                    <div className="p-2 bg-surface rounded text-xs text-muted italic mb-2">
                      &ldquo;{script.script}&rdquo;
                    </div>
                    <div className="space-y-1">
                      {script.tips.map((tip, i) => (
                        <p key={i} className="text-xs text-muted">• {tip}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Potential savings */}
          {expense.usageStatus !== "active" && (
            <div className="bg-success-light border border-success/20 rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-success" />
                <h2 className="text-sm font-semibold text-success">Potential Savings</h2>
              </div>
              <p className="text-2xl font-bold text-success tabular-nums">
                {formatCurrency(expense.usageStatus === "dont_use" ? normalizedAnnual : normalizedAnnual * 0.5)}
              </p>
              <p className="text-xs text-muted mt-1">per year</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
