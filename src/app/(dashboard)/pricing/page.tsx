"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  X,
  Zap,
  Crown,
  Infinity,
  Shield,
  TrendingUp,
  Brain,
  Calendar,
  BarChart3,
  Download,
  Bell,
  Target,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react"

const PAYPAL_LINK = "https://www.paypal.me/NicoFR01"

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: null,
    description: "Start understanding where your money goes.",
    icon: Shield,
    highlight: false,
    cta: "Current Plan",
    features: [
      { text: "Track up to 15 recurring expenses", included: true },
      { text: "Basic dashboard & spending overview", included: true },
      { text: "Usage status tracking (Active/Rarely Used/Don't Use)", included: true },
      { text: "Basic savings recommendations", included: true },
      { text: "Upcoming renewal calendar", included: true },
      { text: "1 savings goal", included: true },
      { text: "CSV import", included: true },
      { text: "Price history tracking", included: false },
      { text: "Advanced AI analysis", included: false },
      { text: "Savings simulator", included: false },
      { text: "Monthly reports & trends", included: false },
      { text: "Expense DNA & health scores", included: false },
      { text: "Bill negotiation scripts", included: false },
      { text: "Unlimited expenses", included: false },
      { text: "Unlimited savings goals", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 4.99,
    period: "month",
    description: "Everything you need to actually reduce your spending.",
    icon: Zap,
    highlight: true,
    badge: "Most Popular",
    cta: "Upgrade to Pro",
    features: [
      { text: "Unlimited recurring expenses", included: true },
      { text: "Advanced dashboard with spending trends", included: true },
      { text: "Usage status + Expense DNA lifecycle", included: true },
      { text: "Advanced savings recommendations", included: true },
      { text: "Upcoming renewal calendar with reminders", included: true },
      { text: "Unlimited savings goals", included: true },
      { text: "CSV import with smart mapping", included: true },
      { text: "Full price history tracking & alerts", included: true },
      { text: "AI-powered expense analysis", included: true },
      { text: "Interactive savings simulator", included: true },
      { text: "Monthly reports & spending trends", included: true },
      { text: "Expense health scores & radar", included: true },
      { text: "Bill negotiation scripts", included: true },
      { text: "Bulk expense actions", included: true },
      { text: "12-month commitment view", included: true },
      { text: "Priority support", included: true },
    ],
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: 79,
    period: null,
    description: "One payment. All current and future Pro features forever.",
    icon: Crown,
    highlight: false,
    badge: "Best Value",
    cta: "Get Lifetime Access",
    features: [
      { text: "Everything in Pro, forever", included: true },
      { text: "All future Pro features included free", included: true },
      { text: "No recurring charges — ever", included: true },
      { text: "Founding member badge", included: true },
      { text: "Direct feature request priority", included: true },
      { text: "Lifetime priority support", included: true },
    ],
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState("free")
  const [loading, setLoading] = useState<string | null>(null)
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly")

  useEffect(() => {
    fetch("/api/user/plan")
      .then((r) => r.json())
      .then((d) => {
        if (d.plan) setCurrentPlan(d.plan)
      })
      .catch(() => {})
  }, [])

  const [showPayPalModal, setShowPayPalModal] = useState<"pro" | "lifetime" | null>(null)

  const handleUpgrade = (planId: string) => {
    if (planId === "free" || planId === currentPlan) return
    setShowPayPalModal(planId as "pro" | "lifetime")
  }

  const [sending, setSending] = useState(false)

  const openPayPal = async (plan: "pro" | "lifetime") => {
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
    const amount = plan === "pro" ? (billing === "yearly" ? "47.88" : "4.99") : "79"
    const description = plan === "pro" ? (billing === "yearly" ? "LifeOS Pro Yearly" : "LifeOS Pro Monthly") : "LifeOS Lifetime"
    window.open(`${PAYPAL_LINK}/${amount}?description=${encodeURIComponent(description)}`, "_blank")
    setShowPayPalModal(null)
    setSending(false)
  }

  // PayPal confirmation modal
  if (showPayPalModal) {
    const amount = showPayPalModal === "pro" ? (billing === "yearly" ? "$47.88/year" : "$4.99/mo") : "$79 once"
    const planName = showPayPalModal === "pro" ? "Pro" : "Lifetime"

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {showPayPalModal === "pro" ? (
              <Zap className="w-8 h-8 text-primary" />
            ) : (
              <Crown className="w-8 h-8 text-amber-500" />
            )}
          </div>
          <h2 className="text-xl font-bold mb-2">Upgrade to {planName}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You&apos;ll be redirected to PayPal to complete your payment of <span className="font-bold text-foreground">{amount}</span>
          </p>
          
          <div className="bg-surface-hover rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-muted-foreground mb-2">After payment:</p>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Complete payment on PayPal</li>
              <li>Email us at <span className="font-medium text-foreground">support@lifeos.app</span></li>
              <li>Include your PayPal email and LifeOS email</li>
              <li>We&apos;ll activate your Pro account within 24 hours</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowPayPalModal(null)}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              onClick={() => openPayPal(showPayPalModal)}
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
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-border/30 border border-border text-xs font-medium text-muted-foreground mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Simple pricing
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Invest in your financial clarity
        </h1>
        <p className="text-muted-foreground text-base max-w-xl mx-auto">
          Most people waste more on subscriptions than LifeOS Pro costs.
          Find one unused service and it pays for itself.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-sm font-medium ${billing === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
            Monthly
          </span>
          <button
            onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
            className="relative w-12 h-6 rounded-full bg-border/50 transition-colors"
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-foreground transition-transform ${
                billing === "yearly" ? "translate-x-6" : ""
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${billing === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
            Yearly
            <span className="ml-1.5 text-xs font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {TIERS.map((tier) => {
          const Icon = tier.icon
          const isCurrent = tier.id === currentPlan
          const isPro = tier.id === "pro"
          const displayPrice = isPro && billing === "yearly" ? 3.99 : tier.price
          const displayPeriod = tier.period === "month" && billing === "yearly" ? "month" : tier.period

          return (
            <div
              key={tier.id}
              className={`relative rounded-xl border p-6 transition-all ${
                tier.highlight
                  ? "border-foreground bg-card shadow-lg scale-[1.02]"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                      tier.id === "lifetime"
                        ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        : "bg-foreground text-background"
                    }`}
                  >
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tier.highlight ? "bg-foreground text-background" : "bg-border/30 text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm">{tier.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{tier.description}</p>
                <div className="flex items-baseline gap-1">
                  {tier.price === 0 ? (
                    <span className="text-3xl font-bold">$0</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">${displayPrice}</span>
                      {displayPeriod && (
                        <span className="text-sm text-muted-foreground">/{displayPeriod}</span>
                      )}
                    </>
                  )}
                </div>
                {isPro && billing === "yearly" && (
                  <p className="text-xs text-success mt-1">
                    $47.88/year — save $12 vs monthly
                  </p>
                )}
                {tier.id === "lifetime" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    One-time payment
                  </p>
                )}
              </div>

              <button
                onClick={() => handleUpgrade(tier.id)}
                disabled={isCurrent || loading === tier.id}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all mb-5 ${
                  isCurrent
                    ? "bg-border/30 text-muted-foreground cursor-default"
                    : tier.highlight
                    ? "bg-foreground text-background hover:opacity-90"
                    : tier.id === "lifetime"
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-border/30 text-foreground hover:bg-border/50"
                }`}
              >
                {loading === tier.id ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : isCurrent ? (
                  "Current Plan"
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    {tier.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>

              <div className="space-y-2.5">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {feature.included ? (
                      <Check className="w-3.5 h-3.5 mt-0.5 text-success shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/40 shrink-0" />
                    )}
                    <span
                      className={`text-xs leading-relaxed ${
                        feature.included ? "text-foreground" : "text-muted-foreground/50"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ROI Calculator */}
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-2">Does Pro pay for itself?</h3>
          <p className="text-xs text-muted-foreground mb-4">
            If LifeOS helps you cancel just <strong>one</strong> unused subscription, you save more than the annual cost.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">$4.99</div>
              <div className="text-[10px] text-muted-foreground">Pro monthly cost</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">$59.88</div>
              <div className="text-[10px] text-muted-foreground">Pro annual cost</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-success">$420+</div>
              <div className="text-[10px] text-muted-foreground">Avg. user savings/yr</div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto mt-10 mb-8">
        <h3 className="text-sm font-semibold text-center mb-5">Frequently asked questions</h3>
        <div className="space-y-3">
          {[
            {
              q: "Do you connect to my bank account?",
              a: "No. LifeOS works through manual entry and CSV import. We never access your bank. Your financial data stays private.",
            },
            {
              q: "Can I cancel anytime?",
              a: "Yes. Cancel your Pro subscription anytime from Settings. You keep access until the end of your billing period.",
            },
            {
              q: "What happens to my data if I downgrade?",
              a: "Nothing. All your data stays. You just lose access to Pro features. Re-upgrade anytime to get them back.",
            },
            {
              q: "Is my financial data secure?",
              a: "Yes. We use encrypted storage, secure authentication, and never share your data. Each user's data is completely isolated.",
            },
          ].map((faq, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm font-medium mb-1">{faq.q}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
