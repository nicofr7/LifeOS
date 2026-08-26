"use client"

import { useMemo } from "react"
import {
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Tag,
  Activity,
  Zap,
} from "lucide-react"

interface ExpenseDNAProps {
  expense: {
    id: string
    name: string
    monthlyCost: number
    billingFrequency: string
    usageStatus: string
    isEssential: boolean
    createdAt: string
    priceHistory: { price: number; date: string; notes?: string | null }[]
  }
}

interface DNAFingerprint {
  age: { days: number; label: string }
  priceVolatility: "stable" | "volatile" | "increasing"
  usagePattern: "active" | "fading" | "unused"
  essentiality: "essential" | "nice-to-have" | "unnecessary"
  costTier: "low" | "medium" | "high" | "premium"
  score: number
  insights: string[]
}

function calculateDNA(expense: ExpenseDNAProps["expense"]): DNAFingerprint {
  const now = new Date()
  const created = new Date(expense.createdAt)
  const ageDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  
  // Age label
  let ageLabel = "New"
  if (ageDays > 365) ageLabel = "Veteran"
  else if (ageDays > 180) ageLabel = "Established"
  else if (ageDays > 90) ageLabel = "Mature"
  else if (ageDays > 30) ageLabel = "Growing"

  // Price volatility
  let priceVolatility: DNAFingerprint["priceVolatility"] = "stable"
  if (expense.priceHistory.length >= 2) {
    const firstPrice = expense.priceHistory[expense.priceHistory.length - 1].price
    const lastPrice = expense.priceHistory[0].price
    const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100
    
    if (changePercent > 15) priceVolatility = "increasing"
    else if (changePercent < -15) priceVolatility = "volatile"
  }

  // Usage pattern
  let usagePattern: DNAFingerprint["usagePattern"] = "active"
  if (expense.usageStatus === "dont_use") usagePattern = "unused"
  else if (expense.usageStatus === "rarely_used") usagePattern = "fading"

  // Essentiality
  let essentiality: DNAFingerprint["essentiality"] = "nice-to-have"
  if (expense.isEssential) essentiality = "essential"
  else if (expense.usageStatus === "dont_use") essentiality = "unnecessary"

  // Cost tier (monthly)
  let costTier: DNAFingerprint["costTier"] = "low"
  if (expense.monthlyCost >= 100) costTier = "premium"
  else if (expense.monthlyCost >= 50) costTier = "high"
  else if (expense.monthlyCost >= 20) costTier = "medium"

  // Calculate DNA score (0-100)
  let score = 50
  
  // Positive factors
  if (essentiality === "essential") score += 20
  if (usagePattern === "active") score += 15
  if (priceVolatility === "stable") score += 10
  if (costTier === "low") score += 5
  
  // Negative factors
  if (essentiality === "unnecessary") score -= 30
  if (usagePattern === "unused") score -= 25
  if (priceVolatility === "increasing") score -= 10
  if (costTier === "premium") score -= 5

  score = Math.max(0, Math.min(100, score))

  // Generate insights
  const insights: string[] = []
  
  if (usagePattern === "unused") {
    insights.push("This expense is not being used")
  }
  if (priceVolatility === "increasing") {
    insights.push("Price has increased over time")
  }
  if (ageDays > 365 && usagePattern === "active" && essentiality === "essential") {
    insights.push("Long-term essential service")
  }
  if (costTier === "premium" && usagePattern !== "active") {
    insights.push("High cost with low usage")
  }

  return {
    age: { days: ageDays, label: ageLabel },
    priceVolatility,
    usagePattern,
    essentiality,
    costTier,
    score,
    insights,
  }
}

export function ExpenseDNA({ expense }: ExpenseDNAProps) {
  const dna = useMemo(() => calculateDNA(expense), [expense])
  
  const scoreColor = dna.score >= 70 ? "text-success" : dna.score >= 40 ? "text-warning" : "text-destructive"
  const scoreLabel = dna.score >= 70 ? "Healthy" : dna.score >= 40 ? "Review" : "At Risk"

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Expense DNA
        </h3>
        <div className={`text-right ${scoreColor}`}>
          <p className="text-2xl font-bold">{dna.score}</p>
          <p className="text-xs text-muted">{scoreLabel}</p>
        </div>
      </div>

      {/* DNA Fingerprint */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="p-2 bg-surface-hover rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3 text-muted" />
            <span className="text-xs text-muted">Age</span>
          </div>
          <p className="text-sm font-medium">{dna.age.label}</p>
          <p className="text-xs text-muted">{dna.age.days} days</p>
        </div>

        <div className="p-2 bg-surface-hover rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3 h-3 text-muted" />
            <span className="text-xs text-muted">Cost Tier</span>
          </div>
          <p className="text-sm font-medium capitalize">{dna.costTier}</p>
          <p className="text-xs text-muted">${expense.monthlyCost}/mo</p>
        </div>

        <div className="p-2 bg-surface-hover rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-muted" />
            <span className="text-xs text-muted">Usage</span>
          </div>
          <p className="text-sm font-medium capitalize">{dna.usagePattern}</p>
        </div>

        <div className="p-2 bg-surface-hover rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-3 h-3 text-muted" />
            <span className="text-xs text-muted">Essentiality</span>
          </div>
          <p className="text-sm font-medium capitalize">{dna.essentiality}</p>
        </div>

        <div className="p-2 bg-surface-hover rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            {dna.priceVolatility === "increasing" ? (
              <TrendingUp className="w-3 h-3 text-destructive" />
            ) : dna.priceVolatility === "volatile" ? (
              <TrendingDown className="w-3 h-3 text-warning" />
            ) : (
              <Activity className="w-3 h-3 text-success" />
            )}
            <span className="text-xs text-muted">Price Trend</span>
          </div>
          <p className="text-sm font-medium capitalize">{dna.priceVolatility}</p>
        </div>

        <div className="p-2 bg-surface-hover rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-3 h-3 text-muted" />
            <span className="text-xs text-muted">Billing</span>
          </div>
          <p className="text-sm font-medium capitalize">{expense.billingFrequency.replace("-", " ")}</p>
        </div>
      </div>

      {/* Insights */}
      {dna.insights.length > 0 && (
        <div className="space-y-2">
          {dna.insights.map((insight, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {insight}
            </div>
          ))}
        </div>
      )}

      {/* DNA Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted mb-1">
          <span>Expense Health</span>
          <span>{dna.score}/100</span>
        </div>
        <div className="w-full bg-surface-hover rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              dna.score >= 70 ? "bg-success" : dna.score >= 40 ? "bg-warning" : "bg-destructive"
            }`}
            style={{ width: `${dna.score}%` }}
          />
        </div>
      </div>
    </div>
  )
}
