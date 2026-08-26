"use client"

import { useState, useEffect } from "react"
import {
  Sliders,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import { ProFeatureGate } from "@/components/pro-feature-gate"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface Recommendation {
  id: string
  type: string
  reason: string
  estimatedSaving: number
  difficulty: string
  isActive: boolean
  expense: {
    id: string
    name: string
    monthlyCost: number
    usageStatus: string
    category: string
  }
}

interface DashboardData {
  totalMonthly: number
  totalAnnual: number
  totalExpenses: number
}

export default function SimulatorPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [recsRes, dashRes] = await Promise.all([
        fetch("/api/recommendations"),
        fetch("/api/dashboard"),
      ])

      if (recsRes.ok) {
        const recsData = await recsRes.json()
        setRecommendations(recsData.recommendations)
      }
      if (dashRes.ok) {
        const dashData = await dashRes.json()
        setDashboard(dashData)
      }
    } catch (err) {
      console.error("Failed to fetch data:", err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleRecommendation(id: string) {
    setToggling(id)
    try {
      const rec = recommendations.find((r) => r.id === id)
      if (!rec) return

      const res = await fetch(`/api/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rec.isActive }),
      })

      if (res.ok) {
        setRecommendations((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, isActive: !r.isActive } : r
          )
        )
      }
    } catch (err) {
      console.error("Failed to toggle recommendation:", err)
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const currentMonthly = dashboard?.totalMonthly || 0
  const currentAnnual = dashboard?.totalAnnual || 0

  const activeSavings = recommendations
    .filter((r) => r.isActive)
    .reduce((sum, r) => sum + r.estimatedSaving, 0)

  const afterMonthly = currentMonthly - activeSavings / 12
  const afterAnnual = afterMonthly * 12
  const monthlySavings = currentMonthly - afterMonthly
  const annualSavings = currentAnnual - afterAnnual

  const savingsPercent =
    currentAnnual > 0
      ? ((annualSavings / currentAnnual) * 100).toFixed(1)
      : "0"

  return (
    <ProFeatureGate featureName="Savings Simulator" description="Interactive simulator to see how changes to your expenses affect your monthly and annual spending.">
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Savings Simulator</h1>
        <p className="text-muted mt-1">
          Toggle recommendations to see how much you could save
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-muted">Current Monthly</p>
          <p className="text-2xl font-bold">{formatCurrency(currentMonthly)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">After Changes</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(afterMonthly)}
          </p>
        </div>
        <div className="card border-success/20 bg-success/5">
          <p className="text-sm text-muted">Monthly Savings</p>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(monthlySavings)}
          </p>
        </div>
        <div className="card border-success/20 bg-success/5">
          <p className="text-sm text-muted">Annual Savings</p>
          <p className="text-3xl font-bold text-success">
            {formatCurrency(annualSavings)}
          </p>
          <p className="text-sm text-success">{savingsPercent}% reduction</p>
        </div>
      </div>

      {/* Visual comparison */}
      <div className="card">
        <h2 className="font-semibold mb-4">Spending Comparison</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Annual Spending</span>
              <span className="font-bold">{formatCurrency(currentAnnual)}</span>
            </div>
            <div className="w-full bg-surface-hover rounded-full h-4">
              <div
                className="bg-muted h-4 rounded-full transition-all"
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-success">
                After Changes
              </span>
              <span className="font-bold text-success">
                {formatCurrency(afterAnnual)}
              </span>
            </div>
            <div className="w-full bg-surface-hover rounded-full h-4">
              <div
                className="bg-success h-4 rounded-full transition-all"
                style={{
                  width: `${currentAnnual > 0 ? (afterAnnual / currentAnnual) * 100 : 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toggle recommendations */}
      <div className="card">
        <h2 className="font-semibold mb-4">Toggle Recommendations</h2>
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                  rec.isActive
                    ? "border-success bg-success/5"
                    : "border-border hover:bg-surface-hover"
                }`}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{rec.expense.name}</p>
                    <span className="badge badge-primary text-xs">
                      {rec.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{rec.reason}</p>
                  <p className="text-sm text-success font-medium mt-1">
                    Save {formatCurrency(rec.estimatedSaving)}/yr
                  </p>
                </div>
                <button
                  onClick={() => toggleRecommendation(rec.id)}
                  disabled={toggling === rec.id}
                  className="flex-shrink-0"
                >
                  {toggling === rec.id ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted" />
                  ) : rec.isActive ? (
                    <ToggleRight className="w-8 h-8 text-success" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Sliders className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted">
              No recommendations available. Add more expenses and mark their
              usage status to get recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
    </ProFeatureGate>
  )
}
