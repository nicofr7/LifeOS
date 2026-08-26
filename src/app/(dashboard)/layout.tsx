"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Receipt,
  Radar,
  Calendar,
  Sliders,
  Calculator,
  BarChart3,
  Target,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Brain,
  Upload,
  Plus,
  Zap,
  Crown,
  ArrowRight,
} from "lucide-react"
import { LifeOSLogo, LifeOSLogoFullSmall } from "@/components/logo"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, accent: true },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Radar", href: "/savings", icon: Radar },
  { name: "Commitments", href: "/commitments", icon: BarChart3 },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Simulator", href: "/simulator", icon: Sliders },
  { name: "Calculator", href: "/calculator", icon: Calculator },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "AI Analysis", href: "/ai", icon: Brain },
  { name: "Import", href: "/import", icon: Upload },
  { name: "Reports", href: "/reports", icon: FileText },
]

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  actionUrl: string | null
  createdAt: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [userPlan, setUserPlan] = useState<string>("free")
  const [usage, setUsage] = useState<{ expenses: { used: number; limit: number; atLimit: boolean; nearLimit: boolean }; goals: { used: number; limit: number; atLimit: boolean; nearLimit: boolean } }>({ expenses: { used: 0, limit: 15, atLimit: false, nearLimit: false }, goals: { used: 0, limit: 1, atLimit: false, nearLimit: false } })
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkSession()
  }, [])

  useEffect(() => {
    if (user) {
      fetchNotifications()
      generateNotifications()
      const interval = setInterval(fetchNotifications, 60000)
      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
  }, [showNotifications])

  async function checkSession() {
    try {
      const res = await fetch("/api/auth/session")
      const data = await res.json()
      if (!data.user) {
        router.push("/login")
      } else {
        setUser(data.user)
        // Fetch plan + usage
        try {
          const planRes = await fetch("/api/user/plan")
          const planData = await planRes.json()
          if (planData.plan) setUserPlan(planData.plan)
        } catch {}
        try {
          const usageRes = await fetch("/api/user/usage")
          const usageData = await usageRes.json()
          if (usageData.expenses && usageData.goals) {
            setUsage({ expenses: usageData.expenses, goals: usageData.goals })
          }
        } catch {}
      }
    } catch {
      router.push("/login")
    }
  }

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch {}
  }

  async function generateNotifications() {
    try {
      await fetch("/api/notifications/generate", { method: "POST" })
      fetchNotifications()
    } catch {}
  }

  async function markNotificationsRead(ids?: string[]) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: ids ? JSON.stringify({ ids }) : JSON.stringify({ markAll: true }),
      })
      fetchNotifications()
    } catch {}
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/"
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "renewal": return "📅"
      case "warning": return "⚠️"
      case "saving": return "💰"
      case "goal": return "🎯"
      default: return "ℹ️"
    }
  }

  function getTimeAgo(date: string) {
    const now = new Date()
    const d = new Date(date)
    const minutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60))
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LifeOSLogo className="w-10 h-10" />
          <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-surface border-r border-border transform transition-transform duration-150 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-14 px-4 border-b border-border">
            <Link href="/" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
              <LifeOSLogo className="w-7 h-7" />
              <div className="flex items-baseline">
                <span className="font-bold text-sm tracking-tight">Life</span>
                <span className="font-bold text-sm tracking-tight text-secondary">OS</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-3 px-3">
            <div className="space-y-0.5">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? "bg-foreground text-white font-medium shadow-sm"
                        : "text-muted hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-muted group-hover:text-foreground'}`} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Plan badge + usage */}
          {userPlan === "free" && (
            <div className="mx-3 mb-2 space-y-2">
              {/* Usage counter */}
              <div className="px-3 py-2 rounded-lg bg-surface-hover border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted uppercase tracking-wider">Usage</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-muted">Expenses</span>
                      <span className={`text-[10px] font-medium ${usage.expenses.atLimit ? 'text-destructive' : usage.expenses.nearLimit ? 'text-warning' : 'text-muted'}`}>{usage.expenses.used}/{usage.expenses.limit}</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1">
                      <div className={`h-1 rounded-full transition-all ${usage.expenses.atLimit ? 'bg-destructive' : usage.expenses.nearLimit ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${Math.min(100, (usage.expenses.used / (usage.expenses.limit || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-muted">Goals</span>
                      <span className={`text-[10px] font-medium ${usage.goals.atLimit ? 'text-destructive' : 'text-muted'}`}>{usage.goals.used}/{usage.goals.limit}</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1">
                      <div className={`h-1 rounded-full transition-all ${usage.goals.atLimit ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.min(100, (usage.goals.used / (usage.goals.limit || 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              <Link
                href="/pricing"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-colors group"
              >
                <div className="w-6 h-6 rounded-md bg-foreground/10 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium">Upgrade to Pro</p>
                  <p className="text-[10px] text-muted-light">$4.99/mo</p>
                </div>
                <ArrowRight className="w-3 h-3 text-muted group-hover:text-foreground transition-colors" />
              </Link>
            </div>
          )}
          {userPlan === "pro" && (
            <div className="mx-3 mb-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10">
                <Zap className="w-3 h-3 text-foreground" />
                <span className="text-[11px] font-medium text-muted">Pro Plan</span>
              </div>
            </div>
          )}
          {userPlan === "lifetime" && (
            <div className="mx-3 mb-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <Crown className="w-3 h-3 text-amber-500" />
                <span className="text-[11px] font-medium text-muted">Lifetime</span>
              </div>
            </div>
          )}

          {/* Bottom section */}
          <div className="border-t border-border p-3">
            <Link
              href="/settings"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                pathname === "/settings"
                  ? "bg-foreground text-white font-medium"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>

            {/* User */}
            <div className="flex items-center gap-2.5 px-2.5 py-2 mt-1">
              <div className="w-7 h-7 bg-foreground rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-[10px]">
                  {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{user.name || "User"}</p>
                <p className="text-[10px] text-muted-light truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded transition-colors"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-56">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center h-12 px-3 border-b border-border bg-surface">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1 text-muted hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <LifeOSLogo className="w-5 h-5" />
            <div className="flex items-baseline">
              <span className="font-semibold text-xs tracking-tight">Life</span>
              <span className="font-semibold text-xs tracking-tight text-secondary">OS</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowQuickAdd(true)}
              className="p-1.5 text-muted hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 text-muted hover:text-foreground relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop header with actions */}
        <div className="hidden lg:flex items-center justify-end h-12 px-6 border-b border-border bg-surface/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQuickAdd(true)}
              className="btn btn-primary text-sm h-8"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Expense
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-muted hover:text-foreground relative rounded-lg hover:bg-surface-hover transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-xl shadow-lg z-50 max-h-96 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markNotificationsRead()}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-80">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            if (!n.read) markNotificationsRead([n.id])
                            if (n.actionUrl) {
                              router.push(n.actionUrl)
                            }
                            setShowNotifications(false)
                          }}
                          className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-surface-hover transition-colors ${
                            !n.read ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-sm flex-shrink-0">{getNotificationIcon(n.type)}</span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm ${!n.read ? "font-medium" : ""}`}>{n.title}</p>
                              <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-muted-light mt-1">{getTimeAgo(n.createdAt)}</p>
                            </div>
                            {!n.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl">{children}</main>
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <QuickAddModal onClose={() => setShowQuickAdd(false)} />
      )}
    </div>
  )
}

function QuickAddModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    monthlyCost: "",
    category: "other",
    billingFrequency: "monthly",
    provider: "",
    usageStatus: "active",
    isEssential: true,
  })

  const quickTemplates = [
    { name: "Netflix", category: "entertainment", cost: 15.99 },
    { name: "Spotify", category: "entertainment", cost: 9.99 },
    { name: "Gym Membership", category: "health_fitness", cost: 35 },
    { name: "Internet", category: "utilities", cost: 60 },
    { name: "Phone Plan", category: "utilities", cost: 45 },
    { name: "Insurance", category: "insurance", cost: 100 },
    { name: "Cloud Storage", category: "software", cost: 9.99 },
    { name: "Software Subscription", category: "software", cost: 20 },
  ]

  function applyTemplate(template: typeof quickTemplates[0]) {
    setForm(prev => ({
      ...prev,
      name: template.name,
      category: template.category,
      monthlyCost: template.cost.toString(),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.monthlyCost) {
      setError("Name and cost are required")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          monthlyCost: parseFloat(form.monthlyCost),
          category: form.category,
          billingFrequency: form.billingFrequency,
          provider: form.provider || null,
          usageStatus: form.usageStatus,
          isEssential: form.isEssential,
          nextBillingDate: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        onClose()
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || "Failed to add expense")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl w-full max-w-md border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Quick Add Expense</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <p className="text-xs text-muted mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {quickTemplates.map(t => (
              <button
                key={t.name}
                onClick={() => applyTemplate(t)}
                className="px-2.5 py-1 text-xs border border-border rounded-lg hover:bg-surface-hover transition-colors"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="input text-sm"
              placeholder="Netflix, Gym, Internet..."
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Cost per cycle *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.monthlyCost}
                onChange={e => setForm({ ...form, monthlyCost: e.target.value })}
                className="input text-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Frequency</label>
              <select
                value={form.billingFrequency}
                onChange={e => setForm({ ...form, billingFrequency: e.target.value })}
                className="select text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi-annual">Every 6 months</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="select text-sm"
              >
                <option value="entertainment">Entertainment</option>
                <option value="utilities">Utilities</option>
                <option value="insurance">Insurance</option>
                <option value="transportation">Transportation</option>
                <option value="food">Food</option>
                <option value="software">Software</option>
                <option value="health_fitness">Health & Fitness</option>
                <option value="shopping">Shopping</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Provider</label>
              <input
                type="text"
                value={form.provider}
                onChange={e => setForm({ ...form, provider: e.target.value })}
                className="input text-sm"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isEssential}
                onChange={e => setForm({ ...form, isEssential: e.target.checked })}
                className="rounded border-border"
              />
              Essential
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-outline flex-1 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1 text-sm">
              {loading ? "Adding..." : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
