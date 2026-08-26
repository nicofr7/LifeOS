"use client"

import { useMemo } from "react"
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  Check,
  ArrowRight,
} from "lucide-react"

interface BillingCalculatorProps {
  expense: {
    name: string
    monthlyCost: number
    billingFrequency: string
  }
}

interface BillingOption {
  frequency: string
  label: string
  costPerCycle: number
  monthlyEquivalent: number
  annualCost: number
  savingsVsMonthly: number
  savingsPercent: number
}

function calculateBillingOptions(monthlyCost: number): BillingOption[] {
  const options: BillingOption[] = []

  // Monthly (baseline)
  options.push({
    frequency: "monthly",
    label: "Monthly",
    costPerCycle: monthlyCost,
    monthlyEquivalent: monthlyCost,
    annualCost: monthlyCost * 12,
    savingsVsMonthly: 0,
    savingsPercent: 0,
  })

  // Annual (assume 15% discount)
  const annualDiscount = 0.15
  const annualCost = monthlyCost * 12 * (1 - annualDiscount)
  options.push({
    frequency: "yearly",
    label: "Annual",
    costPerCycle: annualCost,
    monthlyEquivalent: annualCost / 12,
    annualCost: annualCost,
    savingsVsMonthly: monthlyCost * 12 - annualCost,
    savingsPercent: annualDiscount * 100,
  })

  // Semi-annual (assume 10% discount)
  const semiAnnualDiscount = 0.10
  const semiAnnualCost = monthlyCost * 6 * (1 - semiAnnualDiscount)
  options.push({
    frequency: "semi-annual",
    label: "Every 6 months",
    costPerCycle: semiAnnualCost,
    monthlyEquivalent: semiAnnualCost / 6,
    annualCost: semiAnnualCost * 2,
    savingsVsMonthly: monthlyCost * 12 - semiAnnualCost * 2,
    savingsPercent: semiAnnualDiscount * 100,
  })

  // Quarterly (assume 5% discount)
  const quarterlyDiscount = 0.05
  const quarterlyCost = monthlyCost * 3 * (1 - quarterlyDiscount)
  options.push({
    frequency: "quarterly",
    label: "Quarterly",
    costPerCycle: quarterlyCost,
    monthlyEquivalent: quarterlyCost / 3,
    annualCost: quarterlyCost * 4,
    savingsVsMonthly: monthlyCost * 12 - quarterlyCost * 4,
    savingsPercent: quarterlyDiscount * 100,
  })

  return options
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function BillingCalculator({ expense }: BillingCalculatorProps) {
  const options = useMemo(
    () => calculateBillingOptions(expense.monthlyCost),
    [expense.monthlyCost]
  )

  // Find current option
  const currentOption = options.find(o => o.frequency === expense.billingFrequency) || options[0]
  
  // Find best option
  const bestOption = options.reduce((best, current) => 
    current.savingsVsMonthly > best.savingsVsMonthly ? current : best
  , options[0])

  // Filter out current option and options with no savings
  const betterOptions = options.filter(
    o => o.frequency !== expense.billingFrequency && o.savingsVsMonthly > 0
  )

  return (
    <div className="card">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" />
        Smart Billing Calculator
      </h3>

      {/* Current vs Best Comparison */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-surface-hover rounded-lg">
          <p className="text-sm text-muted mb-1">Current Plan</p>
          <p className="text-xl font-bold">{currentOption.label}</p>
          <p className="text-sm text-muted">
            {formatCurrency(currentOption.costPerCycle)} per {currentOption.frequency === "monthly" ? "month" : currentOption.frequency === "yearly" ? "year" : currentOption.frequency === "semi-annual" ? "6 months" : "quarter"}
          </p>
        </div>

        {bestOption.frequency !== expense.billingFrequency && (
          <div className="p-4 bg-success/5 rounded-lg border border-success/20">
            <p className="text-sm text-muted mb-1">Best Option</p>
            <p className="text-xl font-bold text-success">{bestOption.label}</p>
            <p className="text-sm text-success font-medium">
              Save {formatCurrency(bestOption.savingsVsMonthly)}/year ({bestOption.savingsPercent.toFixed(0)}% off)
            </p>
          </div>
        )}
      </div>

      {/* All Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted">All Billing Options</h4>
        
        {options.map((option) => {
          const isCurrent = option.frequency === expense.billingFrequency
          const isBest = option.savingsVsMonthly === Math.max(...options.map(o => o.savingsVsMonthly))
          
          return (
            <div
              key={option.frequency}
              className={`p-4 rounded-lg border transition-all ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : isBest && option.savingsVsMonthly > 0
                  ? "border-success bg-success/5"
                  : "border-border hover:border-border-dark"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isCurrent
                      ? "bg-primary/10"
                      : isBest && option.savingsVsMonthly > 0
                      ? "bg-success/10"
                      : "bg-surface-hover"
                  }`}>
                    {isCurrent ? (
                      <Check className="w-5 h-5 text-primary" />
                    ) : isBest && option.savingsVsMonthly > 0 ? (
                      <TrendingDown className="w-5 h-5 text-success" />
                    ) : (
                      <Calculator className="w-5 h-5 text-muted" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted">
                      {formatCurrency(option.costPerCycle)} per{" "}
                      {option.frequency === "monthly" ? "month" : 
                       option.frequency === "yearly" ? "year" : 
                       option.frequency === "semi-annual" ? "6 months" : "quarter"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-medium">{formatCurrency(option.monthlyEquivalent)}/mo</p>
                  {option.savingsVsMonthly > 0 ? (
                    <p className="text-sm text-success font-medium">
                      Save {formatCurrency(option.savingsVsMonthly)}/yr
                    </p>
                  ) : isCurrent ? (
                    <p className="text-sm text-muted">Current</p>
                  ) : (
                    <p className="text-sm text-muted">-</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recommendation */}
      {betterOptions.length > 0 && (
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-3">
            <TrendingDown className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium mb-1">LifeOS Recommendation</p>
              <p className="text-sm text-muted">
                Switching to <span className="font-medium text-primary">{bestOption.label}</span> billing 
                would save you <span className="font-medium text-success">{formatCurrency(bestOption.savingsVsMonthly)}/year</span> 
                ({bestOption.savingsPercent.toFixed(0)}% off).
              </p>
              <p className="text-xs text-muted mt-2">
                You would pay {formatCurrency(bestOption.costPerCycle)} upfront 
                instead of {formatCurrency(expense.monthlyCost)}/month.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
