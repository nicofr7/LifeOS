"use client"

import { useState } from "react"
import {
  Phone,
  Copy,
  Check,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface NegotiationScriptsProps {
  expense: {
    name: string
    category: string
    monthlyCost: number
    provider?: string | null
    billingFrequency: string
    cancellationDifficulty: string
    priceHistory: { price: number; date: string }[]
  }
}

interface Script {
  title: string
  approach: "phone" | "email" | "chat"
  difficulty: "easy" | "medium" | "hard"
  talkingPoints: string[]
  sampleScript: string
  potentialSavings: string
  bestTime: string
  tips: string[]
}

function generateScripts(expense: NegotiationScriptsProps["expense"]): Script[] {
  const scripts: Script[] = []
  const hasPriceIncrease = expense.priceHistory.length >= 2 && 
    expense.priceHistory[0].price > expense.priceHistory[1].price * 1.05

  // Script 1: Loyalty Discount
  scripts.push({
    title: "Loyalty Discount Request",
    approach: "phone",
    difficulty: "easy",
    talkingPoints: [
      `I've been a customer for a while and I'm reviewing my expenses`,
      `I'm considering switching to a competitor`,
      `I'd like to stay but need a better rate`,
    ],
    sampleScript: `Hi, I've been a ${expense.name} customer and I'm reviewing my monthly expenses. I've noticed my bill is $${expense.monthlyCost}/month. I've seen some competitors offering similar services for less. I'd like to stay with you, but I need a better rate. Do you have any loyalty discounts or promotional rates available?`,
    potentialSavings: "10-25%",
    bestTime: "Weekday mornings",
    tips: [
      "Be polite but firm",
      "Mention competitors by name if possible",
      "Ask for the retention department if the first agent can't help",
    ],
  })

  // Script 2: Price Increase Challenge (if there was a price increase)
  if (hasPriceIncrease) {
    const increase = expense.priceHistory[0].price - expense.priceHistory[1].price
    scripts.push({
      title: "Price Increase Challenge",
      approach: "phone",
      difficulty: "medium",
      talkingPoints: [
        `I noticed my bill increased by $${increase.toFixed(2)}`,
        `This wasn't communicated clearly`,
        `I need to understand why or find a better option`,
      ],
      sampleScript: `Hi, I'm calling about a recent price increase on my ${expense.name} account. My bill went from $${expense.priceHistory[1].price.toFixed(2)} to $${expense.priceHistory[0].price.toFixed(2)}. I wasn't notified about this change. Can you explain why this happened? Is there a way to keep my previous rate, or do you have any plans that would bring my cost back down?`,
      potentialSavings: `$${increase.toFixed(2)}/month`,
      bestTime: "Within 30 days of increase",
      tips: [
        "Be specific about the increase amount",
        "Ask when you were notified",
        "Request to speak with a supervisor if needed",
      ],
    })
  }

  // Script 3: Downgrade Request
  if (expense.monthlyCost > 30) {
    scripts.push({
      title: "Plan Downgrade",
      approach: "email",
      difficulty: "easy",
      talkingPoints: [
        `I'm not using all the features in my current plan`,
        `I'd like to switch to a more basic option`,
        `I want to reduce my monthly costs`,
      ],
      sampleScript: `Subject: Request to Downgrade ${expense.name} Plan\n\nHi,\n\nI'm currently paying $${expense.monthlyCost}/month for my ${expense.name} subscription. I've realized I'm not using all the features in my current plan and would like to downgrade to a more basic option.\n\nCould you please let me know what lower-tier plans are available and how much I could save? I'd like to keep the essential features but reduce my monthly cost.\n\nThank you,`,
      potentialSavings: "20-40%",
      bestTime: "Anytime",
      tips: [
        "Email creates a paper trail",
        "List the features you actually use",
        "Ask for a comparison of available plans",
      ],
    })
  }

  // Script 4: Competitor Match
  scripts.push({
    title: "Competitor Price Match",
    approach: "chat",
    difficulty: "medium",
    talkingPoints: [
      `I found a competitor offering this for less`,
      `I'd like to stay if you can match the price`,
      `Otherwise I'll need to switch`,
    ],
    sampleScript: `Hi, I'm currently paying $${expense.monthlyCost}/month for ${expense.name}. I've been researching alternatives and found that [Competitor] offers a similar service for $[lower price]/month. I'd prefer to stay with you, but I need to make sure I'm getting the best value. Can you match or beat that price?`,
    potentialSavings: "15-30%",
    bestTime: "When competitor has a promotion",
    tips: [
      "Have a specific competitor and price ready",
      "Be prepared to actually switch if they say no",
      "Check for hidden fees in competitor pricing",
    ],
  })

  // Script 5: Annual Billing Discount
  if (expense.billingFrequency === "monthly" && expense.monthlyCost > 20) {
    scripts.push({
      title: "Annual Billing Switch",
      approach: "email",
      difficulty: "easy",
      talkingPoints: [
        `I'd like to switch to annual billing`,
        `What discount do you offer for paying yearly?`,
        `I want to lock in a better rate`,
      ],
      sampleScript: `Subject: Switch to Annual Billing - ${expense.name}\n\nHi,\n\nI'm currently on a monthly billing plan for ${expense.name} at $${expense.monthlyCost}/month. I'd like to switch to annual billing to take advantage of any discounts you offer for yearly payment.\n\nCould you please let me know:\n1. What's the annual billing rate?\n2. How much would I save compared to monthly?\n3. How do I make the switch?\n\nThank you,`,
      potentialSavings: "15-20%",
      bestTime: "Before renewal date",
      tips: [
        "Annual billing usually saves 15-20%",
        "Make sure you'll use the service for a full year",
        "Ask about refund policy if you need to cancel",
      ],
    })
  }

  return scripts
}

export function NegotiationScripts({ expense }: NegotiationScriptsProps) {
  const [expandedScript, setExpandedScript] = useState<number | null>(null)
  const [copiedScript, setCopiedScript] = useState<number | null>(null)

  const scripts = generateScripts(expense)

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedScript(index)
    setTimeout(() => setCopiedScript(null), 2000)
  }

  if (scripts.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          Negotiation Scripts
        </h3>
        <p className="text-muted text-sm">
          No negotiation opportunities identified for this expense.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Phone className="w-5 h-5 text-primary" />
        Negotiation Scripts
      </h3>
      <p className="text-sm text-muted mb-4">
        Use these scripts to negotiate a better rate for {expense.name}
      </p>

      <div className="space-y-3">
        {scripts.map((script, idx) => (
          <div
            key={idx}
            className="border border-border rounded-lg overflow-hidden"
          >
            {/* Script Header */}
            <button
              onClick={() => setExpandedScript(expandedScript === idx ? null : idx)}
              className="w-full p-4 text-left hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    script.approach === "phone" ? "bg-success/10" :
                    script.approach === "email" ? "bg-info/10" : "bg-secondary/10"
                  }`}>
                    {script.approach === "phone" ? (
                      <Phone className="w-4 h-4 text-success" />
                    ) : script.approach === "email" ? (
                      <MessageSquare className="w-4 h-4 text-info" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-secondary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{script.title}</p>
                    <p className="text-xs text-muted capitalize">{script.approach} • {script.difficulty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-success text-xs">{script.potentialSavings}</span>
                  {expandedScript === idx ? (
                    <ChevronUp className="w-4 h-4 text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted" />
                  )}
                </div>
              </div>
            </button>

            {/* Expanded Content */}
            {expandedScript === idx && (
              <div className="p-4 border-t border-border bg-surface-hover/50">
                {/* Talking Points */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Talking Points
                  </h4>
                  <ul className="space-y-1">
                    {script.talkingPoints.map((point, pIdx) => (
                      <li key={pIdx} className="text-sm text-muted flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sample Script */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Sample Script
                    </h4>
                    <button
                      onClick={() => copyToClipboard(script.sampleScript, idx)}
                      className="btn btn-ghost text-xs p-1"
                    >
                      {copiedScript === idx ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-surface rounded-lg border border-border text-sm whitespace-pre-wrap">
                    {script.sampleScript}
                  </div>
                </div>

                {/* Tips */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-warning" />
                    Tips
                  </h4>
                  <ul className="space-y-1">
                    {script.tips.map((tip, tIdx) => (
                      <li key={tIdx} className="text-sm text-muted flex items-start gap-2">
                        <span className="text-warning">!</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Best Time */}
                <div className="mt-4 p-3 bg-info/5 rounded-lg">
                  <p className="text-xs text-muted">
                    <span className="font-medium text-info">Best time to call:</span> {script.bestTime}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
