"use client"

import { useState, useEffect } from "react"

interface PendingPurchase {
  id: string
  userId: string
  name: string
  email: string
  plan: string
  requestedAt: string
  currentPlan: string
}

interface PurchasesData {
  pending: PendingPurchase[]
  confirmed: PendingPurchase[]
  stats: {
    totalIntents: number
    pendingCount: number
    confirmedCount: number
  }
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [showAuthModal, setShowAuthModal] = useState(true)
  const [data, setData] = useState<PurchasesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchPurchases = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/pending", {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error("Failed to fetch purchases:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases()
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchPurchases, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const handleAuth = () => {
    if (apiKey.trim()) {
      setIsAuthenticated(true)
      setShowAuthModal(false)
    }
  }

  const handleActivate = async (userId: string, plan: string) => {
    setActivating(userId)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/activate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, plan }),
      })

      const result = await res.json()

      if (res.ok) {
        setMessage({ type: "success", text: `✅ User activated! Welcome email sent.` })
        fetchPurchases() // Refresh list
      } else {
        setMessage({ type: "error", text: result.error || "Failed to activate" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error" })
    } finally {
      setActivating(null)
    }
  }

  // Auth Modal
  if (showAuthModal) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-white/50">Enter your admin API key to continue</p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter admin API key..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            />
            <button
              onClick={handleAuth}
              disabled={!apiKey.trim()}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-white/10 disabled:text-white/30 text-white font-semibold rounded-xl transition-colors"
            >
              Access Dashboard
            </button>
          </div>

          <p className="text-center text-white/30 text-sm mt-4">
            Default key: lifeos-admin-key-2024
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-white/50">Manage purchases and activate users</p>
            </div>
            <button
              onClick={() => {
                setIsAuthenticated(false)
                setShowAuthModal(true)
                setData(null)
              }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#12121a] border border-white/10 rounded-xl p-6">
              <div className="text-white/50 text-sm mb-1">Pending Activations</div>
              <div className="text-3xl font-bold text-amber-400">{data.stats.pendingCount}</div>
            </div>
            <div className="bg-[#12121a] border border-white/10 rounded-xl p-6">
              <div className="text-white/50 text-sm mb-1">Activated Users</div>
              <div className="text-3xl font-bold text-emerald-400">{data.stats.confirmedCount}</div>
            </div>
            <div className="bg-[#12121a] border border-white/10 rounded-xl p-6">
              <div className="text-white/50 text-sm mb-1">Total Purchase Requests</div>
              <div className="text-3xl font-bold text-white">{data.stats.totalIntents}</div>
            </div>
          </div>
        )}

        {/* Pending Purchases */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-amber-400">⏳</span> Pending Activations
          </h2>

          {!data?.pending.length ? (
            <div className="bg-[#12121a] border border-white/10 rounded-xl p-8 text-center">
              <div className="text-4xl mb-4">✨</div>
              <p className="text-white/50">No pending activations</p>
              <p className="text-white/30 text-sm mt-2">
                When someone buys Pro, they'll appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.pending.map((purchase) => (
                <div
                  key={purchase.id}
                  className="bg-[#12121a] border border-white/10 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                      <span className="text-xl">👤</span>
                    </div>
                    <div>
                      <div className="font-medium text-white">{purchase.name}</div>
                      <div className="text-sm text-white/50">{purchase.email}</div>
                      <div className="text-xs text-white/30 mt-1">
                        Requested {new Date(purchase.requestedAt).toLocaleString()} • Wants{" "}
                        <span className="text-amber-400 capitalize">{purchase.plan}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleActivate(purchase.userId, purchase.plan)}
                    disabled={activating === purchase.userId}
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    {activating === purchase.userId ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>✓ Activate {purchase.plan === "pro" ? "Pro" : "Lifetime"}</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirmed Purchases */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-emerald-400">✅</span> Activated Users
          </h2>

          {!data?.confirmed.length ? (
            <div className="bg-[#12121a] border border-white/10 rounded-xl p-8 text-center">
              <p className="text-white/50">No activated users yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.confirmed.map((purchase) => (
                <div
                  key={purchase.id}
                  className="bg-[#12121a] border border-white/10 rounded-xl p-4 flex items-center justify-between opacity-75"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <span className="text-xl">✅</span>
                    </div>
                    <div>
                      <div className="font-medium text-white">{purchase.name}</div>
                      <div className="text-sm text-white/50">{purchase.email}</div>
                      <div className="text-xs text-white/30 mt-1">
                        Activated as{" "}
                        <span className="text-emerald-400 capitalize">{purchase.currentPlan}</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-medium">
                    Active
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchPurchases}
            disabled={loading}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-white/70 rounded-lg transition-colors"
          >
            {loading ? "Refreshing..." : "Refresh List"}
          </button>
          <p className="text-white/30 text-sm mt-2">Auto-refreshes every 30 seconds</p>
        </div>
      </div>
    </div>
  )
}
