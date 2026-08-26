"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Calculator,
  Target,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  TrendingDown,
  Zap,
} from "lucide-react"

interface Change {
  expenseId: string
  expenseName: string
  category: string
  currentMonthly: number
  potentialSaving: number
  action: string
  reason: string
  difficulty: "easy" | "medium" | "hard"
  usageStatus: string
}

interface Plan {
  changes: Change[]
  totalMonthlySaving: number
  totalAnnualSaving: number
  targetMonthly: number
  targetMet: boolean
  disruptionLevel: string
  remainingBudget: number
}

const PRESETS = [50, 100, 150, 200, 300, 500]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getDifficultyInfo(difficulty: string) {
  switch (difficulty) {
    case "easy":
      return {
        label: "Easy",
        color: "badge-success",
        description: "Quick change, minimal effort",
      }
    case "medium":
      return {
        label: "Medium",
        color: "badge-warning",
        description: "Requires some effort",
      }
    case "hard":
      return {
        label: "Hard",
        color: "badge-destructive",
        description: "Significant effort or commitment change",
      }
    default:
      return { label: difficulty, color: "badge-primary", description: "" }
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case "cancel":
      return "✕"
    case "downgrade":
      return "↓"
    case "change_billing":
      return "⟳"
    case "remove_duplicate":
      return "≡"
    default:
      return "•"
  }
}

export default function CalculatorPage() {
  const [target, setTarget] = useState(100)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasCalculated, setHasCalculated] = useState(false)

  async function calculatePlan() {
    setLoading(true)
    try {
      const res = await fetch(`/api/savings-calculator?target=${target}`)
      if (res.ok) {
        const data = await res.json()
        setPlan(data.plan)
        setHasCalculated(true)
      }
    } catch (err) {
      console.error("Failed to calculate plan:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Savings Calculator</h1>
        <p className="text-sm text-muted mt-1">
          Find the least disruptive way to reach your savings target
        </p>
      </div>

      {/* Target Input */}
      <section className="bg-surface border border-border rounded-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4" />
          <h2 className="text-sm font-semibold">How much do you want to save?</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-muted block mb-2">
              Target monthly savings
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-medium">
                $
              </span>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(Math.max(0, parseInt(e.target.value) || 0))}
                className="input pl-8 text-lg font-semibold"
                min="1"
                step="10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted">Quick presets</span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setTarget(preset)}
                  className={`btn text-xs ${
                    target === preset ? "btn-primary" : "btn-outline"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={calculatePlan}
          disabled={loading || target <= 0}
          className="btn btn-primary mt-4 w-full sm:w-auto"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Calculator className="w-4 h-4" />
          )}
          Find my plan
        </button>
      </section>

      {/* Results */}
      {plan && (
        <div className="space-y-6">
          {/* Summary */}
          <section className="grid sm:grid-cols-3 gap-4">
            <div
              className={`bg-surface border rounded-md p-4 ${
                plan.targetMet ? "border-success" : "border-border"
              }`}
            >
              <p className="text-xs text-muted mb-1">Monthly savings</p>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  plan.targetMet ? "text-success" : "text-foreground"
                }`}
              >
                {formatCurrency(plan.totalMonthlySaving)}
              </p>
              <p className="text-xs text-muted mt-1">
                {plan.targetMet
                  ? `Target met! (${formatCurrency(plan.targetMonthly)}/mo)`
                  : `${formatCurrency(plan.remainingBudget)} short of target`}
              </p>
            </div>

            <div className="bg-surface border border-border rounded-md p-4">
              <p className="text-xs text-muted mb-1">Annual savings</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(plan.totalAnnualSaving)}
              </p>
              <p className="text-xs text-muted mt-1">
                {plan.changes.length} change{plan.changes.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="bg-surface border border-border rounded-md p-4">
              <p className="text-xs text-muted mb-1">Disruption level</p>
              <p className="text-lg font-semibold capitalize mt-1">
                {plan.disruptionLevel}
              </p>
              <p className="text-xs text-muted mt-1">
                {plan.disruptionLevel === "minimal" && "Easy changes only"}
                {plan.disruptionLevel === "moderate" && "Some effort required"}
                {plan.disruptionLevel === "significant" && "Major changes needed"}
                {plan.disruptionLevel === "none" && "No changes found"}
              </p>
            </div>
          </section>

          {/* Target progress */}
          {plan.targetMet && (
            <section className="bg-success/5 border border-success/20 rounded-md p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">
                  Target reached!
                </span>
              </div>
              <p className="text-sm text-muted mt-1">
                With {plan.changes.length} change{plan.changes.length !== 1 ? "s" : ""}, you
                can save {formatCurrency(plan.totalMonthlySaving)}/month — that&apos;s{" "}
                {formatCurrency(plan.totalAnnualSaving)}/year.
              </p>
            </section>
          )}

          {!plan.targetMet && plan.changes.length > 0 && (
            <section className="bg-warning-light border border-warning/20 rounded-md p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium text-warning">
                  Not quite there yet
                </span>
              </div>
              <p className="text-sm text-muted mt-1">
                These changes save {formatCurrency(plan.totalMonthlySaving)}/month. You need{" "}
                {formatCurrency(plan.remainingBudget)}/month more to reach your{" "}
                {formatCurrency(target)}/month target.
              </p>
            </section>
          )}

          {/* Changes list */}
          {plan.changes.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold mb-3">Recommended plan</h2>
              <div className="space-y-3">
                {plan.changes.map((change, index) => {
                  const diffInfo = getDifficultyInfo(change.difficulty)
                  return (
                    <div
                      key={`${change.expenseId}-${change.action}`}
                      className="bg-surface border border-border rounded-md p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 bg-surface-hover rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              href={`/expenses/${change.expenseId}`}
                              className="font-medium text-sm hover:underline"
                            >
                              {change.expenseName}
                            </Link>
                            <span className="text-xs text-muted capitalize">
                              {change.action.replace("_", " ")}
                            </span>
                            <span className={`badge text-xs ${diffInfo.color}`}>
                              {diffInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted mb-2">{change.reason}</p>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-success">
                              +{formatCurrency(change.potentialSaving)}/mo
                            </span>
                            <span className="text-xs text-muted">
                              ({formatCurrency(change.potentialSaving * 12)}/yr)
                            </span>
                            <span className="text-xs text-muted">
                              Currently: {formatCurrency(change.currentMonthly)}/mo
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : (
            hasCalculated && (
              <section className="text-center py-8">
                <div className="w-12 h-12 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-muted" />
                </div>
                <h3 className="text-sm font-semibold mb-1">No changes needed</h3>
                <p className="text-sm text-muted">
                  Your expenses are already well-optimized. Add more expenses or mark
                  some as unused to find savings opportunities.
                </p>
              </section>
            )
          )}

          {/* Tips */}
          {plan.changes.length > 0 && (
            <section className="bg-surface border border-border rounded-md p-4">
              <h3 className="text-sm font-semibold mb-2">How this works</h3>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <span className="text-foreground mt-0.5">•</span>
                  LifeOS prioritizes easy changes first to minimize disruption
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-foreground mt-0.5">•</span>
                  Each recommendation is based on your actual expense data
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-foreground mt-0.5">•</span>
                  Use the Simulator to see the full impact before making changes
                </li>
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasCalculated && (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-6 h-6 text-muted" />
          </div>
          <h3 className="text-sm font-semibold mb-1">Find your savings plan</h3>
          <p className="text-sm text-muted max-w-sm mx-auto">
            Enter a target amount and LifeOS will find the least disruptive way to
            reach it. We prioritize easy changes over hard ones.
          </p>
        </div>
      )}
    </div>
  )
}
