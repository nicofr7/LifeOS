"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  PiggyBank,
  TrendingDown,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Info,
} from "lucide-react"

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
  confidence: string
  dataUsed: string
  isActive: boolean
  expense: {
    id: string
    name: string
    monthlyCost: number
    usageStatus: string
    category: string
    provider: string | null
  }
}

function getRecommendationIcon(type: string) {
  switch (type) {
    case "cancel":
      return <XCircle className="w-5 h-5 text-destructive" />
    case "downgrade":
      return <TrendingDown className="w-5 h-5 text-warning" />
    case "switch":
      return <ArrowRight className="w-5 h-5 text-info" />
    case "negotiate":
      return <AlertTriangle className="w-5 h-5 text-secondary" />
    case "change_billing":
      return <Info className="w-5 h-5 text-primary" />
    case "remove_duplicate":
      return <AlertTriangle className="w-5 h-5 text-warning" />
    case "keep":
      return <CheckCircle className="w-5 h-5 text-success" />
    default:
      return <Info className="w-5 h-5 text-muted" />
  }
}

function getRecommendationLabel(type: string) {
  switch (type) {
    case "cancel": return "Cancel"
    case "downgrade": return "Downgrade"
    case "switch": return "Switch Provider"
    case "negotiate": return "Negotiate"
    case "change_billing": return "Change Billing"
    case "remove_duplicate": return "Possible Duplicate"
    case "keep": return "Keep"
    default: return type
  }
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "easy": return "badge-success"
    case "medium": return "badge-warning"
    case "hard": return "badge-destructive"
    default: return "badge-primary"
  }
}

function getConfidenceColor(confidence: string) {
  switch (confidence) {
    case "high": return "badge-success"
    case "medium": return "badge-warning"
    case "low": return "badge-primary"
    default: return "badge-primary"
  }
}

export default function SavingsPage() {
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchRecommendations()
  }, [])

  async function fetchRecommendations() {
    try {
      const res = await fetch("/api/recommendations")
      if (res.ok) {
        const data = await res.json()
        setRecommendations(data.recommendations)
      }
    } catch (err) {
      console.error("Failed to fetch recommendations:", err)
    } finally {
      setLoading(false)
    }
  }

  async function generateRecommendations() {
    setGenerating(true)
    try {
      const res = await fetch("/api/recommendations", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setRecommendations(data.recommendations)
      }
    } catch (err) {
      console.error("Failed to generate recommendations:", err)
    } finally {
      setGenerating(false)
    }
  }

  async function toggleRecommendation(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        setRecommendations((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, isActive: !isActive } : r
          )
        )
      }
    } catch (err) {
      console.error("Failed to toggle recommendation:", err)
    }
  }

  const totalPotentialSavings = recommendations.reduce(
    (sum, rec) => sum + rec.estimatedSaving,
    0
  )

  const activeSavings = recommendations
    .filter((rec) => rec.isActive)
    .reduce((sum, rec) => sum + rec.estimatedSaving, 0)

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Savings Opportunities</h1>
          <p className="text-muted mt-1">
            Recommendations to reduce your recurring expenses
          </p>
        </div>
        <button
          onClick={generateRecommendations}
          disabled={generating}
          className="btn btn-primary"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PiggyBank className="w-4 h-4" />
          )}
          Refresh Analysis
        </button>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-muted">Total Potential Savings</p>
          <p className="text-3xl font-bold text-success mt-1">
            {formatCurrency(totalPotentialSavings)}
          </p>
          <p className="text-sm text-muted">per year</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Active Savings</p>
          <p className="text-3xl font-bold text-primary mt-1">
            {formatCurrency(activeSavings)}
          </p>
          <p className="text-sm text-muted">per year (from activated recommendations)</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Recommendations</p>
          <p className="text-3xl font-bold mt-1">{recommendations.length}</p>
          <p className="text-sm text-muted">
            {recommendations.filter((r) => r.isActive).length} activated
          </p>
        </div>
      </div>

      {/* Recommendations list */}
      {recommendations.length === 0 ? (
        <div className="card text-center py-12">
          <PiggyBank className="w-12 h-12 text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No recommendations yet</h2>
          <p className="text-muted mb-4">
            Add more expenses and mark their usage status to get personalized
            savings recommendations.
          </p>
          <button
            onClick={() => router.push("/expenses?action=add")}
            className="btn btn-primary"
          >
            Add Expenses
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`card transition-all ${
                rec.isActive ? "border-success bg-success/5" : ""
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">{getRecommendationIcon(rec.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{rec.expense.name}</h3>
                      <span className="badge badge-primary text-xs">
                        {getRecommendationLabel(rec.type)}
                      </span>
                      {rec.confidence && (
                        <span className={`badge text-xs ${getConfidenceColor(rec.confidence)}`}>
                          {rec.confidence} confidence
                        </span>
                      )}
                      {rec.dataUsed && (
                        <span className="badge text-xs badge-secondary">
                          {rec.dataUsed === "calculated" ? "Calculated" : rec.dataUsed === "estimated" ? "Estimated" : "AI"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted mb-2">{rec.reason}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium text-success">
                        Save {formatCurrency(rec.estimatedSaving)}/yr
                      </span>
                      <span className={`badge ${getDifficultyColor(rec.difficulty)}`}>
                        {rec.difficulty}
                      </span>
                      <span className="text-muted">
                        {rec.expense.provider || rec.expense.category.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push(`/expenses/${rec.expense.id}`)}
                    className="btn btn-ghost text-sm"
                  >
                    View
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleRecommendation(rec.id, rec.isActive)}
                    className={`btn ${rec.isActive ? "btn-outline" : "btn-primary"} text-sm`}
                  >
                    {rec.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
