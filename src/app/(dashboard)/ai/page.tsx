"use client"

import { useState, useEffect } from "react"
import {
  Brain,
  AlertTriangle,
  Info,
  PiggyBank,
  Lightbulb,
  Loader2,
  TrendingDown,
  DollarSign,
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

interface AIInsight {
  type: "warning" | "info" | "saving" | "tip"
  title: string
  description: string
  potentialSaving?: number
  action?: string
}

function getInsightIcon(type: string) {
  switch (type) {
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-warning" />
    case "saving":
      return <PiggyBank className="w-5 h-5 text-success" />
    case "tip":
      return <Lightbulb className="w-5 h-5 text-primary" />
    case "info":
    default:
      return <Info className="w-5 h-5 text-info" />
  }
}

function getInsightColor(type: string) {
  switch (type) {
    case "warning":
      return "border-warning/20 bg-warning/5"
    case "saving":
      return "border-success/20 bg-success/5"
    case "tip":
      return "border-primary/20 bg-primary/5"
    case "info":
    default:
      return "border-info/20 bg-info/5"
  }
}

export default function AIPage() {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    fetchInsights()
  }, [])

  async function fetchInsights() {
    try {
      const res = await fetch("/api/ai")
      if (res.ok) {
        const data = await res.json()
        setInsights(data.insights)
      }
    } catch (err) {
      console.error("Failed to fetch insights:", err)
    } finally {
      setLoading(false)
    }
  }

  async function refreshInsights() {
    setAnalyzing(true)
    try {
      const res = await fetch("/api/ai")
      if (res.ok) {
        const data = await res.json()
        setInsights(data.insights)
      }
    } catch (err) {
      console.error("Failed to refresh insights:", err)
    } finally {
      setAnalyzing(false)
    }
  }

  const totalSavings = insights.reduce(
    (sum, insight) => sum + (insight.potentialSaving || 0),
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
    <ProFeatureGate featureName="AI Analysis" description="AI-powered expense analysis with personalized savings recommendations.">
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Analysis</h1>
          <p className="text-muted mt-1">
            Personalized insights based on your actual spending data
          </p>
        </div>
        <button
          onClick={refreshInsights}
          disabled={analyzing}
          className="btn btn-primary"
        >
          {analyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          Refresh Analysis
        </button>
      </div>

      {/* Summary */}
      {totalSavings > 0 && (
        <div className="card border-success/20 bg-success/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-lg font-bold text-success">
                {formatCurrency(totalSavings)} potential annual savings
              </p>
              <p className="text-sm text-muted">
                Based on analysis of your current expenses
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length === 0 ? (
        <div className="card text-center py-12">
          <Brain className="w-12 h-12 text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No insights yet</h2>
          <p className="text-muted mb-4">
            Add more expenses and mark their usage status to get AI-powered
            insights.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`card border ${getInsightColor(insight.type)} animate-slide-in`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{insight.title}</h3>
                  <p className="text-sm text-muted">{insight.description}</p>
                  {insight.potentialSaving && insight.potentialSaving > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-success" />
                      <span className="text-sm font-medium text-success">
                        Save {formatCurrency(insight.potentialSaving)}/year
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="card">
        <h2 className="font-semibold mb-4">How AI Analysis Works</h2>
        <div className="space-y-3 text-sm text-muted">
          <p>
            LifeOS analyzes your actual expense data to provide personalized
            recommendations. All insights are based on the information you
            provide.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Usage analysis:</strong> Expenses marked as &quot;rarely
              used&quot; or &quot;don&apos;t use&quot; are flagged for potential
              savings.
            </li>
            <li>
              <strong>Duplicate detection:</strong> Multiple services in the
              same category are identified.
            </li>
            <li>
              <strong>Price tracking:</strong> Price increases are detected and
              flagged for review.
            </li>
            <li>
              <strong>Renewal alerts:</strong> Upcoming renewals are highlighted
              for review.
            </li>
          </ul>
          <p className="mt-3">
            <strong>Note:</strong> All savings estimates are based on your
            actual data. No numbers are fabricated or estimated beyond what your
            data provides.
          </p>
        </div>
      </div>
    </div>
    </ProFeatureGate>
  )
}
