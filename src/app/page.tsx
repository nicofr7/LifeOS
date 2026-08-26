"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Loader2, TrendingDown, Shield, BarChart3, Bell, Target, Zap } from "lucide-react"
import { LifeOSLogo } from "@/components/logo"

/* ─── Animated counter hook ─── */
function useCountUp(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!startOnView) { setStarted(true); return }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect() } },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [startOnView])

  useEffect(() => {
    if (!started) return
    let start = 0
    const startTime = performance.now()
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [started, end, duration])

  return { count, ref }
}

/* ─── Feature data ─── */
const features = [
  {
    icon: TrendingDown,
    title: "LifeOS Radar",
    desc: "Continuously monitors your spending and finds things that deserve attention — before they cost you more.",
  },
  {
    icon: BarChart3,
    title: "Savings Simulator",
    desc: "Toggle changes on and off to see exactly how much you save — without committing to anything.",
  },
  {
    icon: Zap,
    title: "Least Painful Savings",
    desc: "Tell LifeOS your target. It finds the easiest combination of changes to hit it.",
  },
  {
    icon: Shield,
    title: "Future Self",
    desc: "Compare doing nothing vs. taking action. See the real financial difference in one view.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Know when prices increase, renewals approach, or unused subscriptions are draining money.",
  },
  {
    icon: Target,
    title: "Savings Goals",
    desc: "Set a target, track your progress, and see how close you are — with estimated timelines.",
  },
]

/* ─── Trusted-by logos placeholder ─── */
const trustedCount = 2847

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const monthly = useCountUp(487, 2200)
  const savings = useCountUp(1176, 2400)
  const users = useCountUp(trustedCount, 2800)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/auth/session")
        const data = await res.json()
        if (data.user) { setIsLoggedIn(true); router.push("/dashboard") }
      } catch {} finally { setLoading(false) }
    })()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-foreground animate-spin" />
      </div>
    )
  }

  if (isLoggedIn) return null

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ─── Header ─── */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LifeOSLogo className="w-7 h-7" />
            <div className="flex items-baseline">
              <span className="font-bold text-[15px] tracking-tight">Life</span>
              <span className="font-bold text-[15px] tracking-tight text-secondary">OS</span>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/login" className="btn btn-ghost text-sm h-9 px-4">Log in</Link>
            <Link href="/signup" className="btn btn-primary text-sm h-9 px-4">Get started</Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="pt-28 sm:pt-36 lg:pt-44 pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-border/80 bg-surface text-xs font-medium text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Recurring expense optimization
            </div>

            {/* Headline */}
            <h1 className="text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-bold tracking-[-0.035em] leading-[1.08] mb-5">
              Stop paying for things
              <br className="hidden sm:block" /> you don&apos;t need.
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted leading-relaxed max-w-xl mb-10">
              LifeOS finds the recurring expenses draining your money, calculates your
              potential savings, and shows you exactly what to do about it.
            </p>

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-14">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2.5 bg-foreground text-white px-6 py-3.5 rounded-lg text-[15px] font-medium tracking-tight transition-all duration-200 hover:bg-primary-light hover:shadow-lg hover:shadow-foreground/10"
              >
                Start for free
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <span className="text-sm text-muted-light">No credit card · No bank access · Free forever</span>
            </div>
          </div>

          {/* ─── Hero visual: Dashboard mockup ─── */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-b from-foreground/[0.03] to-transparent rounded-2xl blur-xl" />

            <div className="relative bg-surface border border-border rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {/* Mockup toolbar */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/60 bg-surface-hover/50">
                <div className="w-2.5 h-2.5 rounded-full bg-border-dark" />
                <div className="w-2.5 h-2.5 rounded-full bg-border-dark" />
                <div className="w-2.5 h-2.5 rounded-full bg-border-dark" />
                <div className="flex-1" />
                <span className="text-[11px] text-muted-light font-medium">LifeOS — Overview</span>
                <div className="flex-1" />
              </div>

              <div className="p-5 sm:p-8">
                {/* Top metrics row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <MetricCard
                    label="Monthly spending"
                    value={`$${monthly.count.toLocaleString()}`}
                    sub="/month"
                    ref={monthly.ref}
                  />
                  <MetricCard
                    label="Annual spending"
                    value={`$${(monthly.count * 12).toLocaleString()}`}
                    sub="/year"
                  />
                  <MetricCard
                    label="Potential savings"
                    value={`$${savings.count.toLocaleString()}`}
                    sub="/year"
                    highlight
                  />
                  <MetricCard
                    label="Expenses tracked"
                    value="14"
                    sub="recurring"
                  />
                </div>

                {/* Bottom: Radar + categories */}
                <div className="grid lg:grid-cols-5 gap-4">
                  {/* Radar alerts */}
                  <div className="lg:col-span-3 border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold tracking-tight uppercase text-muted-light">LifeOS Radar</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-success-light text-success">3 alerts</span>
                    </div>
                    <div className="space-y-2.5">
                      <RadarItem
                        name="Unused gym membership"
                        detail="You marked it as &quot;don&apos;t use&quot;"
                        amount="+$420/yr"
                        severity="high"
                      />
                      <RadarItem
                        name="Internet price increase"
                        detail="Up 17% since January"
                        amount="+$144/yr"
                        severity="medium"
                      />
                      <RadarItem
                        name="Duplicate cloud storage"
                        detail="You have 2 services in Software"
                        amount="+$120/yr"
                        severity="low"
                      />
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="lg:col-span-2 border border-border rounded-lg p-4">
                    <span className="text-xs font-semibold tracking-tight uppercase text-muted-light block mb-3">Where your money goes</span>
                    <div className="space-y-2.5">
                      <CategoryBar label="Utilities" amount="$184" pct={38} />
                      <CategoryBar label="Insurance" amount="$100" pct={21} />
                      <CategoryBar label="Entertainment" amount="$92" pct={19} />
                      <CategoryBar label="Software" amount="$61" pct={12} />
                      <CategoryBar label="Other" amount="$50" pct={10} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats bar ─── */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-3 gap-8 text-center" ref={users.ref}>
            <div>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">{users.count.toLocaleString()}+</p>
              <p className="text-xs sm:text-sm text-muted mt-1">Expenses tracked</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">$2.4M+</p>
              <p className="text-xs sm:text-sm text-muted mt-1">Potential savings found</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">12 min</p>
              <p className="text-xs sm:text-sm text-muted mt-1">Average setup time</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-light mb-3">How it works</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-12">Three steps to saving money</h2>

          <div className="grid sm:grid-cols-3 gap-10 sm:gap-12">
            <Step
              num="01"
              title="Add your expenses"
              desc="Enter or import your recurring expenses, subscriptions, and bills. Takes about 10 minutes."
            />
            <Step
              num="02"
              title="LifeOS analyzes"
              desc="We find unused subscriptions, price increases, duplicates, and savings opportunities — automatically."
            />
            <Step
              num="03"
              title="Take action"
              desc="Follow recommendations, simulate changes, and track what you actually save over time."
            />
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-20 sm:py-28 bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-light mb-3">Features</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-12">Everything you need to optimize spending</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group border border-border rounded-xl p-6 transition-all duration-200 hover:border-border-dark hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-background"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-hover flex items-center justify-center mb-4 group-hover:bg-foreground group-hover:text-white transition-colors duration-200">
                  <f.icon className="w-[18px] h-[18px]" />
                </div>
                <h3 className="text-sm font-semibold tracking-tight mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social proof ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-light mb-3">Trusted by</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              People who got serious about their spending
            </h2>
            <p className="text-base text-muted leading-relaxed mb-10">
              LifeOS helps you understand your recurring financial commitments —
              not just track them, but actually reduce them.
            </p>

            {/* Testimonial cards */}
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              <div className="border border-border rounded-xl p-5 bg-surface">
                <p className="text-sm text-muted leading-relaxed mb-4">
                  &ldquo;I found $140/month in subscriptions I had forgotten about. LifeOS paid for itself in the first hour.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-xs font-semibold">S</div>
                  <div>
                    <p className="text-xs font-semibold">Sarah K.</p>
                    <p className="text-[11px] text-muted-light">Product Manager</p>
                  </div>
                </div>
              </div>
              <div className="border border-border rounded-xl p-5 bg-surface">
                <p className="text-sm text-muted leading-relaxed mb-4">
                  &ldquo;The commitment map showed me I was about to pay $1,200 for insurance I didn&apos;t need. Cancelled it immediately.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-xs font-semibold">M</div>
                  <div>
                    <p className="text-xs font-semibold">Marcus T.</p>
                    <p className="text-[11px] text-muted-light">Freelance Designer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 sm:py-28 border-t border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Find where your money goes.
            </h2>
            <p className="text-base text-muted leading-relaxed mb-8">
              Stop guessing. Start optimizing. LifeOS shows you exactly what you&apos;re
              spending, what you could save, and what to do first.
            </p>
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2.5 bg-foreground text-white px-7 py-4 rounded-lg text-[15px] font-medium tracking-tight transition-all duration-200 hover:bg-primary-light hover:shadow-lg hover:shadow-foreground/10"
            >
              Create free account
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <p className="text-xs text-muted-light mt-4">Free forever · No bank access required</p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <LifeOSLogo className="w-5 h-5" />
            <span className="text-xs text-muted">© 2025 LifeOS. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted">
            <Link href="/login" className="hover:text-foreground transition-colors duration-150">Log in</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors duration-150">Sign up</Link>
            <span className="text-muted-light">Privacy</span>
            <span className="text-muted-light">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ─── Sub-components ─── */

function MetricCard({
  label, value, sub, highlight, ref,
}: {
  label: string; value: string; sub: string; highlight?: boolean; ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div ref={ref} className={`rounded-lg border p-3.5 sm:p-4 ${highlight ? "border-success/30 bg-success/[0.03]" : "border-border bg-background"}`}>
      <p className="text-[11px] text-muted-light font-medium mb-1">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${highlight ? "text-success" : ""}`}>
        {value}
      </p>
      <p className="text-[11px] text-muted-light mt-0.5">{sub}</p>
    </div>
  )
}

function RadarItem({ name, detail, amount, severity }: { name: string; detail: string; amount: string; severity: "high" | "medium" | "low" }) {
  const dot = severity === "high" ? "bg-destructive" : severity === "medium" ? "bg-warning" : "bg-info"
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0 last:pb-0">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{name}</p>
        <p className="text-[11px] text-muted-light">{detail}</p>
      </div>
      <span className="text-[11px] font-semibold text-success tabular-nums flex-shrink-0">{amount}</span>
    </div>
  )
}

function CategoryBar({ label, amount, pct }: { label: string; amount: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-muted">{label}</span>
        <span className="text-[12px] font-semibold tabular-nums">{amount}</span>
      </div>
      <div className="h-1 rounded-full bg-surface-hover overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground/20 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div>
      <div className="text-3xl font-bold tracking-tight text-border-dark mb-3">{num}</div>
      <h3 className="text-base font-semibold tracking-tight mb-1.5">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{desc}</p>
    </div>
  )
}
