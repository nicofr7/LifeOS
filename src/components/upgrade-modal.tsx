"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Zap, Crown, Check, Minus, ExternalLink } from "lucide-react"

const PAYPAL_LINK = "https://www.paypal.me/NicoFR01"

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  feature?: string
  /** What triggered the modal: "expenses" | "goals" | "feature" */
  trigger?: "expenses" | "goals" | "feature"
  /** Current count of the resource */
  currentCount?: number
  /** Max allowed on free plan */
  freeLimit?: number
}

const COMPARISON_ROWS = [
  { label: "Recurring expenses", free: "15 max", pro: "Unlimited" },
  { label: "Savings goals", free: "1", pro: "Unlimited" },
  { label: "Dashboard & overview", free: true, pro: true },
  { label: "Basic recommendations", free: true, pro: true },
  { label: "Calendar & renewals", free: true, pro: true },
  { label: "CSV import", free: true, pro: true },
  { label: "AI analysis", free: false, pro: true },
  { label: "Savings simulator", free: false, pro: true },
  { label: "Price change tracking", free: false, pro: true },
  { label: "Expense DNA", free: false, pro: true },
  { label: "Bill negotiation scripts", free: false, pro: true },
  { label: "Smart billing calculator", free: false, pro: true },
  { label: "12-month commitment view", free: false, pro: true },
  { label: "Advanced reports", free: false, pro: true },
  { label: "Bulk expense actions", free: false, pro: true },
]

export function UpgradeModal({ open, onClose, feature, trigger, currentCount, freeLimit }: UpgradeModalProps) {
  const router = useRouter()
  const [showConfirmation, setShowConfirmation] = useState<"pro" | "lifetime" | null>(null)
  const [sending, setSending] = useState(false)

  if (!open) return null

  const handleUpgrade = (plan: "pro" | "lifetime") => {
    setShowConfirmation(plan)
  }

  const openPayPal = (plan: "pro" | "lifetime") => {
    const amount = plan === "pro" ? "4.99" : "79"
    const description = plan === "pro" ? "LifeOS Pro Monthly" : "LifeOS Lifetime"
    window.open(`${PAYPAL_LINK}/${amount}?description=${encodeURIComponent(description)}`, "_blank")
  }

  const handleConfirmPayment = async (plan: "pro" | "lifetime") => {
    setSending(true)
    try {
      // Send email notification to admin
      await fetch("/api/notify-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
    } catch (err) {
      console.error("Failed to notify:", err)
    }
    // Open PayPal in new tab
    openPayPal(plan)
    // Show pending state
    setShowConfirmation(null)
    setSending(false)
  }

  const title = feature
    ? `Unlock ${feature}`
    : trigger === "expenses"
    ? "Expense limit reached"
    : trigger === "goals"
    ? "Goal limit reached"
    : "Upgrade to Pro"

  const description = feature
    ? `"${feature}" is a Pro feature. Upgrade to access it.`
    : trigger === "expenses"
    ? `Free plan allows up to ${freeLimit ?? 15} expenses. You currently have ${currentCount ?? 0}.`
    : trigger === "goals"
    ? `Free plan allows 1 savings goal. You currently have ${currentCount ?? 0}.`
    : "Get unlimited access to all LifeOS features."

  // Confirmation view
  if (showConfirmation) {
    const amount = showConfirmation === "pro" ? "$4.99/mo" : "$79 once"
    const planName = showConfirmation === "pro" ? "Pro" : "Lifetime"

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-surface border border-border rounded-xl w-full max-w-md overflow-hidden">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {showConfirmation === "pro" ? (
                <Zap className="w-8 h-8 text-primary" />
              ) : (
                <Crown className="w-8 h-8 text-amber-500" />
              )}
            </div>
            <h2 className="text-xl font-bold mb-2">Upgrade to {planName}</h2>
            <p className="text-sm text-muted mb-4">You&apos;ll be redirected to PayPal to complete your payment of <span className="font-bold text-foreground">{amount}</span></p>
            
            <div className="bg-surface-hover rounded-lg p-4 mb-6 text-left">
              <p className="text-xs text-muted mb-2">After payment:</p>
              <ol className="text-xs text-muted space-y-1.5 list-decimal list-inside">
                <li>Complete payment on PayPal</li>
                <li>Email us at <span className="font-medium text-foreground">support@lifeos.app</span></li>
                <li>Include your PayPal email and LifeOS email</li>
                <li>We&apos;ll activate your Pro account within 24 hours</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(null)}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmPayment(showConfirmation)}
                disabled={sending}
                className="btn btn-primary flex-1 gap-2"
              >
                {sending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Pay with PayPal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative p-5 pb-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-md bg-border/30 flex items-center justify-center text-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold mb-1">{title}</h2>
          <p className="text-xs text-muted">{description}</p>
        </div>

        {/* Usage bar — only show when trigger has a count */}
        {trigger && currentCount !== undefined && freeLimit !== undefined && (
          <div className="px-5 pb-3 flex-shrink-0">
            <div className="p-3 bg-surface-hover rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted uppercase tracking-wider">
                  {trigger === "expenses" ? "Expenses" : "Goals"}
                </span>
                <span className="text-sm font-bold">
                  {currentCount}<span className="text-xs font-normal text-muted"> / {freeLimit}</span>
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-destructive transition-all duration-500"
                  style={{ width: `${Math.min(100, (currentCount / (freeLimit || 1)) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-destructive font-medium mt-1.5">
                You&apos;ve reached the limit — upgrade for unlimited {trigger === "expenses" ? "expenses" : "goals"}
              </p>
            </div>
          </div>
        )}

        {/* Comparison table */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-3 bg-surface-hover border-b border-border">
              <div className="px-3 py-2 text-[11px] font-medium text-muted uppercase tracking-wider" />
              <div className="px-3 py-2 text-[11px] font-medium text-muted uppercase tracking-wider text-center">Free</div>
              <div className="px-3 py-2 text-[11px] font-medium text-primary uppercase tracking-wider text-center">Pro</div>
            </div>
            {/* Table rows */}
            <div className="divide-y divide-border/50 max-h-[240px] overflow-y-auto">
              {COMPARISON_ROWS.map((row) => (
                <div key={row.label} className="grid grid-cols-3 hover:bg-surface-hover/50 transition-colors">
                  <div className="px-3 py-2 text-xs text-foreground">{row.label}</div>
                  <div className="px-3 py-2 flex justify-center items-center">
                    {typeof row.free === "boolean" ? (
                      row.free ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-muted/40" />
                      )
                    ) : (
                      <span className="text-[11px] text-muted">{row.free}</span>
                    )}
                  </div>
                  <div className="px-3 py-2 flex justify-center items-center">
                    {typeof row.pro === "boolean" ? (
                      row.pro ? (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-muted/40" />
                      )
                    ) : (
                      <span className="text-[11px] text-primary font-medium">{row.pro}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan options */}
        <div className="px-5 pb-4 flex-shrink-0 space-y-2.5">
          {/* Pro */}
          <button
            onClick={() => handleUpgrade("pro")}
            className="w-full text-left p-3.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Pro</span>
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">MOST POPULAR</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">$4.99</span>
                <span className="text-xs text-muted">/mo</span>
              </div>
            </div>
            <p className="text-[11px] text-muted mb-2">Everything unlocked. Cancel anytime.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center py-2 rounded-md bg-primary text-white text-sm font-medium group-hover:bg-primary/90 transition-colors">
                Start Pro — $4.99/mo
              </div>
            </div>
          </button>

          {/* Lifetime */}
          <button
            onClick={() => handleUpgrade("lifetime")}
            className="w-full text-left p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">Lifetime</span>
                <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">BEST VALUE</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">$79</span>
                <span className="text-xs text-muted">once</span>
              </div>
            </div>
            <p className="text-[11px] text-muted mb-2">Pay once, use forever. All future features included.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center py-2 rounded-md bg-amber-500 text-white text-sm font-medium group-hover:bg-amber-500/90 transition-colors">
                Get Lifetime — $79
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg text-xs text-muted hover:text-foreground transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
