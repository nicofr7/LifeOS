/**
 * Plan gate utilities for LifeOS
 *
 * Feature access is controlled by the user's plan field.
 * Free plan: basic features
 * Pro plan: all features
 * Lifetime: all features + future features
 */

export type PlanTier = "free" | "pro" | "lifetime"

export const PRO_FEATURES = [
  "unlimited_expenses",
  "ai_analysis",
  "savings_simulator",
  "price_tracking",
  "advanced_recommendations",
  "monthly_reports",
  "expense_dna",
  "negotiation_scripts",
  "bulk_actions",
  "commitment_view",
  "unlimited_goals",
] as const

export type ProFeature = (typeof PRO_FEATURES)[number]

// Features that free users can access
const FREE_FEATURES: ProFeature[] = [
  "advanced_recommendations",
]

export function hasFeature(plan: PlanTier, feature: ProFeature): boolean {
  if (plan === "pro" || plan === "lifetime") return true
  return FREE_FEATURES.includes(feature)
}

export function getExpenseLimit(plan: PlanTier): number {
  if (plan === "pro" || plan === "lifetime") return Infinity
  return 15
}

export function getGoalLimit(plan: PlanTier): number {
  if (plan === "pro" || plan === "lifetime") return Infinity
  return 1
}

export function canAddExpense(plan: PlanTier, currentCount: number): boolean {
  return currentCount < getExpenseLimit(plan)
}

export function canAddGoal(plan: PlanTier, currentCount: number): boolean {
  return currentCount < getGoalLimit(plan)
}

export function getPlanName(plan: PlanTier): string {
  switch (plan) {
    case "pro": return "Pro"
    case "lifetime": return "Lifetime"
    default: return "Free"
  }
}

export function getUpgradeMessage(plan: PlanTier): string {
  switch (plan) {
    case "pro":
    case "lifetime":
      return ""
    default:
      return "Upgrade to Pro to unlock this feature"
  }
}
