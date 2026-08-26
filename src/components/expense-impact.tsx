"use client"

import { useMemo } from "react"
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
} from "lucide-react"

interface ExpenseImpactProps {
  expense: {
    name: string
    monthlyCost: number
    annualCost: number
    billingFrequency: string
    usageStatus: string
    isEssential: boolean
    category: string
  }
  userStats: {
    totalMonthly: number
    totalAnnual: number
    savingsGoal?: number
  }
}

interface ImpactAnalysis {
  monthlyImpact: number
  annualImpact: number
  percentOfTotal: number
  categoryPercent: number
  yearsToGoal: number | null
  impactLevel: "low" | "medium" | "high" | "critical"
  insights: string[]
}

function calculateImpact(
  expense: ExpenseImpactProps["expense"],
  userStats: ExpenseImpactProps["userStats"]
): ImpactAnalysis {
  const monthlyImpact = expense.monthlyCost
  const annualImpact = expense.annualCost || expense.monthlyCost * 12
  
  // Percent of total spending
  const percentOfTotal = userStats.totalMonthly > 0
    ? (monthlyImpact / userStats.totalMonthly) * 100
    : 0

  // Category percent (simplified - would need category totals in real implementation)
  const categoryPercent = percentOfTotal // Placeholder

  // Years to reach savings goal if this expense was cut
  let yearsToGoal: number | null = null
  if (userStats.savingsGoal && userStats.savingsGoal > 0) {
    yearsToGoal = userStats.savingsGoal / annualImpact
  }

  // Impact level
  let impactLevel: ImpactAnalysis["impactLevel"] = "low"
  if (percentOfTotal > 30) impactLevel = "critical"
  else if (percentOfTotal > 20) impactLevel = "high"
  else if (percentOfTotal > 10) impactLevel = "medium"

  // Generate insights
  const insights: string[] = []
  
  if (impactLevel === "critical") {
    insights.push("This is a major expense - over 30% of your spending")
  }
  if (impactLevel === "high") {
    insights.push("This expense significantly impacts your budget")
  }
  if (!expense.isEssential) {
    insights.push("Not marked as essential - review if needed")
  }
  if (expense.usageStatus === "dont_use") {
    insights.push("Not being used - cutting this saves " + formatCurrency(annualImpact) + "/year")
  }
  if (yearsToGoal !== null && yearsToGoal < 1) {
    insights.push("Cutting this could help reach your savings goal faster")
  }

  return {
    monthlyImpact,
    annualImpact,
    percentOfTotal,
    categoryPercent,
    yearsToGoal,
    impactLevel,
    insights,
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function ExpenseImpact({ expense, userStats }: ExpenseImpactProps) {
  const impact = useMemo(
    () => calculateImpact(expense, userStats),
    [expense, userStats]
  )

  const impactColor = {
    low: "text-success",
    medium: "text-warning",
    high: "text-secondary",
    critical: "text-destructive",
  }[impact.impactLevel]

  const impactBg = {
    low: "bg-success/10",
    medium: "bg-warning/10",
    high: "bg-secondary/10",
    critical: "bg-destructive/10",
  }[impact.impactLevel]

  return (
    <div className="card">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-primary" />
        Expense Impact
      </h3>

      {/* Impact Score */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${impactBg}`}>
          <div className="text-center">
            <p className={`text-2xl font-bold ${impactColor}`}>
              {impact.percentOfTotal.toFixed(0)}%
            </p>
            <p className="text-xs text-muted">of total</p>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted mb-1">Impact Level</p>
          <p className={`text-lg font-semibold capitalize ${impactColor}`}>
            {impact.impactLevel}
          </p>
          <p className="text-sm text-muted">
            {formatCurrency(impact.monthlyImpact)}/month • {formatCurrency(impact.annualImpact)}/year
          </p>
        </div>
      </div>

      {/* Impact Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-surface-hover rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-muted" />
            <span className="text-xs text-muted">Monthly Impact</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(impact.monthlyImpact)}</p>
        </div>

        <div className="p-3 bg-surface-hover rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-muted" />
            <span className="text-xs text-muted">Annual Impact</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(impact.annualImpact)}</p>
        </div>
      </div>

      {/* Spending Share */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted">Share of Total Spending</span>
          <span className="font-medium">{impact.percentOfTotal.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-surface-hover rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              impact.impactLevel === "critical" ? "bg-destructive" :
              impact.impactLevel === "high" ? "bg-secondary" :
              impact.impactLevel === "medium" ? "bg-warning" : "bg-success"
            }`}
            style={{ width: `${Math.min(100, impact.percentOfTotal)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
        </div>
      </div>

      {/* Savings Goal Impact */}
      {impact.yearsToGoal !== null && (
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 mb-6">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium mb-1">Savings Goal Impact</p>
              <p className="text-sm text-muted">
                If you cut this expense, you&apos;d reach your savings goal{" "}
                <span className="font-medium text-primary">
                  {impact.yearsToGoal < 1
                    ? "in less than a year"
                    : `in ${impact.yearsToGoal.toFixed(1)} years`}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {impact.insights.length > 0 && (
        <div className="space-y-2">
          {impact.insights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <span className="text-muted">{insight}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
