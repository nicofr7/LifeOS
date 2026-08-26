"use client"

import { useState, useEffect } from "react"
import { UpgradeModal } from "./upgrade-modal"
import { Zap, Lock } from "lucide-react"

interface ProFeatureGateProps {
  children: React.ReactNode
  featureName: string
  description?: string
}

export function ProFeatureGate({ children, featureName, description }: ProFeatureGateProps) {
  const [plan, setPlan] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    fetch("/api/user/plan")
      .then((r) => r.json())
      .then((d) => setPlan(d.plan || "free"))
      .catch(() => setPlan("free"))
  }, [])

  if (plan === null) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (plan === "pro" || plan === "lifetime") {
    return <>{children}</>
  }

  return (
    <>
      <div className="relative">
        {/* Blurred content preview */}
        <div className="filter blur-[2px] pointer-events-none opacity-50">
          {children}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
          <div className="text-center p-6 max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-foreground/5 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">{featureName} is a Pro feature</h3>
            <p className="text-sm text-muted mb-4">
              {description || "Upgrade to Pro to unlock this feature and more."}
            </p>
            <button
              onClick={() => setShowUpgrade(true)}
              className="btn btn-primary"
            >
              <Zap className="w-4 h-4" />
              Upgrade to Pro
            </button>
            <p className="text-xs text-muted mt-3">
              $4.99/mo · Cancel anytime
            </p>
          </div>
        </div>
      </div>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={featureName}
      />
    </>
  )
}
