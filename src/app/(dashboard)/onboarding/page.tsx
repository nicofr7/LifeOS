"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Receipt,
  Radar,
  Target,
  Sparkles,
} from "lucide-react"

const steps = [
  {
    id: "welcome",
    title: "Welcome to LifeOS",
    subtitle: "Your personal recurring-expense optimization engine.",
    description: "LifeOS helps you understand, predict, and actively reduce your recurring financial commitments. Let's get you set up.",
  },
  {
    id: "goal",
    title: "What do you want LifeOS to help you with?",
    subtitle: "Select your primary goal",
  },
  {
    id: "add-first",
    title: "Add your first expenses",
    subtitle: "Start with a few recurring bills to see LifeOS in action",
    presets: [
      { name: "Netflix", category: "entertainment", cost: 15.99 },
      { name: "Spotify", category: "entertainment", cost: 9.99 },
      { name: "Gym Membership", category: "health_fitness", cost: 35 },
      { name: "Internet", category: "utilities", cost: 60 },
      { name: "Phone Plan", category: "utilities", cost: 45 },
      { name: "Insurance", category: "insurance", cost: 100 },
      { name: "Cloud Storage", category: "software", cost: 9.99 },
      { name: "Streaming Service", category: "entertainment", cost: 12.99 },
      { name: "Software Subscription", category: "software", cost: 20 },
      { name: "Gym Equipment Rental", category: "health_fitness", cost: 25 },
    ],
  },
  {
    id: "done",
    title: "You're all set!",
    subtitle: "Here's what LifeOS will do for you:",
  },
]

const goals = [
  { id: "save", label: "Save money", description: "Find where I'm wasting money" },
  { id: "reduce", label: "Reduce subscriptions", description: "Cut unnecessary recurring bills" },
  { id: "organize", label: "Organize bills", description: "See all my recurring expenses in one place" },
  { id: "all", label: "All of these", description: "Complete financial awareness" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [selectedGoal, setSelectedGoal] = useState("")
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  function togglePreset(name: string) {
    setSelectedPresets(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function handleFinish() {
    setAdding(true)
    // Add all selected presets
    const presets = steps[2].presets!.filter(p => selectedPresets.has(p.name))
    for (const preset of presets) {
      try {
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: preset.name,
            monthlyCost: preset.cost,
            category: preset.category,
            billingFrequency: "monthly",
            usageStatus: "active",
            isEssential: preset.name === "Insurance" || preset.name === "Internet" || preset.name === "Phone Plan",
            nextBillingDate: new Date().toISOString(),
          }),
        })
      } catch {}
    }
    setAdding(false)
    router.push("/dashboard")
  }

  const current = steps[step]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-foreground" : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="mb-8">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">L</span>
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{current.title}</h1>
              <p className="text-muted">{current.description}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold tracking-tight">{current.title}</h1>
              <p className="text-muted">{current.subtitle}</p>
              <div className="grid gap-3 mt-6">
                {goals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`text-left p-4 rounded-lg border transition-all ${
                      selectedGoal === goal.id
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <p className="font-medium">{goal.label}</p>
                    <p className="text-sm text-muted mt-0.5">{goal.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold tracking-tight">{current.title}</h1>
              <p className="text-muted">{current.subtitle}</p>
              <p className="text-xs text-muted-light">
                Click to select expenses you have. Don't worry — you can edit or remove any later.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {current.presets!.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => togglePreset(preset.name)}
                    className={`text-left p-3 rounded-lg border transition-all text-sm ${
                      selectedPresets.has(preset.name)
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{preset.name}</span>
                      {selectedPresets.has(preset.name) && (
                        <CheckCircle2 className="w-4 h-4 text-foreground" />
                      )}
                    </div>
                    <span className="text-xs text-muted">${preset.cost}/mo</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-light">
                Selected: {selectedPresets.size} expense{selectedPresets.size !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-success mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{current.title}</h1>
              <p className="text-muted">{current.subtitle}</p>
              <div className="space-y-4 mt-6">
                {[
                  { icon: Receipt, title: "Track everything", desc: "See all your recurring expenses in one place" },
                  { icon: Radar, title: "Detect waste", desc: "LifeOS finds unused subscriptions and duplicates" },
                  { icon: Target, title: "Set goals", desc: "Track your progress toward savings targets" },
                  { icon: Sparkles, title: "Get insights", desc: "AI-powered analysis of your spending patterns" },
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <feature.icon className="w-5 h-5 text-muted mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{feature.title}</p>
                      <p className="text-xs text-muted">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="btn btn-outline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !selectedGoal}
              className="btn btn-primary flex-1"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={adding}
              className="btn btn-primary flex-1"
            >
              {adding ? "Setting up..." : "Go to Dashboard"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Skip */}
        {step < steps.length - 1 && (
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full mt-4 text-center text-sm text-muted hover:text-foreground transition-colors"
          >
            Skip setup
          </button>
        )}
      </div>
    </div>
  )
}
