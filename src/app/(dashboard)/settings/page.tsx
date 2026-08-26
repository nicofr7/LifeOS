"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Settings,
  User,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  Loader2,
  Check,
  Download,
  FileText,
  Key,
  Trash2,
  Zap,
  BarChart3,
  Receipt,
  Target,
} from "lucide-react"
import Link from "next/link"
import { CURRENCIES } from "@/lib/utils"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string; plan: string; currency: string } | null>(null)
  const [settings, setSettings] = useState({
    currency: "USD",
    emailNotifications: true,
    savingsAlerts: true,
    renewalReminders: true,
    weeklyReport: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [usage, setUsage] = useState<{ plan: string; expenses: { used: number; limit: number; atLimit: boolean; nearLimit: boolean }; goals: { used: number; limit: number; atLimit: boolean; nearLimit: boolean } } | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    fetchUser()
    fetchSettings()
    fetchUsage()
  }, [])

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/session")
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        // Also fetch plan from usage API
        try {
          const usageRes = await fetch("/api/user/usage")
          if (usageRes.ok) {
            const usageData = await usageRes.json()
            setUser(prev => prev ? { ...prev, plan: usageData.plan } : prev)
          }
        } catch {}
      }
    } catch (err) {
      console.error("Failed to fetch user:", err)
    }
  }

  async function fetchUsage() {
    try {
      const res = await fetch("/api/user/usage")
      if (res.ok) {
        const data = await res.json()
        setUsage(data)
      }
    } catch {}
  }

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        setSettings({
          currency: data.settings.currency || "USD",
          emailNotifications: data.settings.emailNotifications ?? true,
          savingsAlerts: data.settings.savingsAlerts ?? true,
          renewalReminders: data.settings.renewalReminders ?? true,
          weeklyReport: data.settings.weeklyReport ?? false,
        })
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSettings() {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await res.json()
        setError(data.error || "Failed to save settings")
      }
    } catch {
      setError("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess(false)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords don't match")
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      if (res.ok) {
        setPasswordSuccess(true)
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
        setTimeout(() => setPasswordSuccess(false), 3000)
      } else {
        const data = await res.json()
        setPasswordError(data.error || "Failed to change password")
      }
    } catch {
      setPasswordError("Failed to change password")
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    setDeleteError("")
    setDeleteLoading(true)
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      })
      if (res.ok) {
        window.location.href = "/"
      } else {
        const data = await res.json()
        setDeleteError(data.error || "Failed to delete account")
      }
    } catch {
      setDeleteError("Failed to delete account")
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-foreground border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted mt-1">Manage your account and preferences</p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Profile */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">Profile</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Name</label>
            <input
              type="text"
              value={user?.name || ""}
              readOnly
              className="input text-sm bg-surface-hover"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="input text-sm bg-surface-hover"
            />
          </div>
        </div>
      </div>

      {/* Plan & Billing */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">Plan & Billing</h2>
        </div>
        <div className="space-y-3">
          {/* Current plan */}
          <div className="flex items-center justify-between p-3 bg-surface-hover rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm capitalize">{user?.plan || "Free"} Plan</p>
                {user?.plan === "pro" && <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">ACTIVE</span>}
                {user?.plan === "lifetime" && <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">LIFETIME</span>}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {user?.plan === "pro"
                  ? "$4.99/mo — Unlimited expenses, AI analysis, simulator, price tracking, and more."
                  : user?.plan === "lifetime"
                  ? "$79 one-time — All current and future Pro features included forever."
                  : "Up to 15 expenses, basic analysis. Upgrade for unlimited access."}
              </p>
            </div>
            {user?.plan === "free" ? (
              <Link href="/pricing" className="btn btn-primary text-xs h-8">
                <Zap className="w-3 h-3" />
                Upgrade
              </Link>
            ) : (
              <Link href="/pricing" className="btn btn-outline text-xs h-8">
                Change Plan
              </Link>
            )}
          </div>

          {/* Billing management — for paid plans */}
          {user?.plan !== "free" && (
            <div className="p-3 bg-surface-hover rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Billing</p>
                  <p className="text-xs text-muted mt-0.5">
                    {user?.plan === "pro"
                      ? "Manage your subscription, update payment method, or view invoices."
                      : "View your purchase receipt."}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/stripe/portal", { method: "POST" })
                      const data = await res.json()
                      if (data.url) {
                        window.location.href = data.url
                      } else {
                        alert(data.error || "Could not open billing portal")
                      }
                    } catch {
                      alert("Could not open billing portal")
                    }
                  }}
                  className="btn btn-outline text-xs h-8"
                >
                  <CreditCard className="w-3 h-3" />
                  Manage Billing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Dashboard */}
      {usage && usage.plan === "free" && (
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-muted" />
              <h2 className="font-semibold text-sm">Usage</h2>
            </div>
            {(usage.expenses.atLimit || usage.goals.atLimit) && (
              <Link href="/pricing" className="text-[11px] font-medium text-primary hover:underline">
                Upgrade to unlock more →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Expenses usage */}
            <div className={`p-4 rounded-lg border ${usage.expenses.atLimit ? 'bg-destructive/5 border-destructive/20' : usage.expenses.nearLimit ? 'bg-warning/5 border-warning/20' : 'bg-surface-hover border-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${usage.expenses.atLimit ? 'bg-destructive/10' : usage.expenses.nearLimit ? 'bg-warning/10' : 'bg-foreground/5'}`}>
                    <Receipt className={`w-3.5 h-3.5 ${usage.expenses.atLimit ? 'text-destructive' : usage.expenses.nearLimit ? 'text-warning' : 'text-muted'}`} />
                  </div>
                  <span className="font-medium text-sm">Expenses</span>
                </div>
                <span className={`text-lg font-bold ${usage.expenses.atLimit ? 'text-destructive' : usage.expenses.nearLimit ? 'text-warning' : 'text-foreground'}`}>
                  {usage.expenses.used}<span className="text-sm font-normal text-muted">/{usage.expenses.limit}</span>
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${usage.expenses.atLimit ? 'bg-destructive' : usage.expenses.nearLimit ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, (usage.expenses.used / (usage.expenses.limit || 1)) * 100)}%` }}
                />
              </div>
              {usage.expenses.atLimit ? (
                <p className="text-[11px] text-destructive font-medium">Limit reached — upgrade for unlimited expenses</p>
              ) : usage.expenses.nearLimit ? (
                <p className="text-[11px] text-warning font-medium">{usage.expenses.limit - usage.expenses.used} expense{usage.expenses.limit - usage.expenses.used !== 1 ? 's' : ''} remaining on Free plan</p>
              ) : (
                <p className="text-[11px] text-muted">Free plan includes {usage.expenses.limit} expenses</p>
              )}
            </div>

            {/* Goals usage */}
            <div className={`p-4 rounded-lg border ${usage.goals.atLimit ? 'bg-destructive/5 border-destructive/20' : 'bg-surface-hover border-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${usage.goals.atLimit ? 'bg-destructive/10' : 'bg-foreground/5'}`}>
                    <Target className={`w-3.5 h-3.5 ${usage.goals.atLimit ? 'text-destructive' : 'text-muted'}`} />
                  </div>
                  <span className="font-medium text-sm">Goals</span>
                </div>
                <span className={`text-lg font-bold ${usage.goals.atLimit ? 'text-destructive' : 'text-foreground'}`}>
                  {usage.goals.used}<span className="text-sm font-normal text-muted">/{usage.goals.limit}</span>
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${usage.goals.atLimit ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, (usage.goals.used / (usage.goals.limit || 1)) * 100)}%` }}
                />
              </div>
              {usage.goals.atLimit ? (
                <p className="text-[11px] text-destructive font-medium">Limit reached — upgrade for unlimited goals</p>
              ) : (
                <p className="text-[11px] text-muted">Free plan includes {usage.goals.limit} goal</p>
              )}
            </div>
          </div>

          {/* Pro feature comparison */}
          <div className="mt-4 p-4 bg-surface-hover rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <p className="font-medium text-xs">Pro plan includes:</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                'Unlimited expenses',
                'Unlimited goals',
                'AI analysis',
                'Savings simulator',
                'Price tracking',
                'Advanced reports',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="text-[11px] text-muted">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preferences */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">Preferences</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Currency</label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="select text-sm"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.id} value={currency.id}>
                  {currency.symbol} {currency.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted mt-1">
              Currency display is for labeling only. All calculations use raw values you enter.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">Notifications</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: "emailNotifications", label: "Email Notifications", desc: "Reminders about upcoming renewals" },
            { key: "savingsAlerts", label: "Savings Alerts", desc: "New savings opportunities" },
            { key: "renewalReminders", label: "Renewal Reminders", desc: "Before expenses renew" },
            { key: "weeklyReport", label: "Weekly Report", desc: "Weekly spending summary" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted">{desc}</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, [key]: !settings[key as keyof typeof settings] })}
                className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${
                  settings[key as keyof typeof settings] ? "bg-foreground" : "bg-border"
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                  settings[key as keyof typeof settings] ? "translate-x-5" : "translate-x-1"
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">Security</h2>
        </div>

        {!showPasswordChange ? (
          <button
            onClick={() => setShowPasswordChange(true)}
            className="btn btn-outline text-sm"
          >
            <Key className="w-4 h-4" />
            Change Password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3">
            {passwordError && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-2 bg-success/10 border border-success/20 rounded text-sm text-success">
                Password changed successfully
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="input text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="input text-sm"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="input text-sm"
                minLength={8}
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="btn btn-primary text-sm"
              >
                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                Update Password
              </button>
              <button
                type="button"
                onClick={() => { setShowPasswordChange(false); setPasswordError(""); setPasswordSuccess(false) }}
                className="btn btn-outline text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : null}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      {/* Data Export */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">Data Export</h2>
        </div>
        <p className="text-xs text-muted mb-4">
          Export your expenses and savings data for your records or to use in other apps.
        </p>
        <div className="flex gap-3">
          <a href="/api/export?format=csv" className="btn btn-outline text-sm" download>
            <FileText className="w-4 h-4" />
            Export CSV
          </a>
          <a href="/api/export?format=json" className="btn btn-outline text-sm" download>
            <Download className="w-4 h-4" />
            Export JSON
          </a>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-surface border border-destructive/20 rounded-lg p-5">
        <h2 className="font-semibold text-sm text-destructive mb-3">Danger Zone</h2>
        {!showDeleteConfirm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Delete Account</p>
              <p className="text-xs text-muted">Permanently delete your account and all data. This cannot be undone.</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-outline text-destructive text-sm border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-3">
            {deleteError && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                {deleteError}
              </div>
            )}
            <p className="text-sm text-destructive font-medium">
              This action is irreversible. All your data will be permanently deleted.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Enter your password to confirm</label>
              <input
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                className="input text-sm"
                placeholder="Your password"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleteLoading || !deletePassword}
                className="btn text-sm bg-destructive text-white hover:bg-destructive/90"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Permanently Delete Account
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); setDeleteError("") }}
                className="btn btn-outline text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="btn btn-outline w-full text-destructive hover:bg-destructive/10 hover:border-destructive/20"
      >
        <LogOut className="w-4 h-4" />
        Log Out
      </button>
    </div>
  )
}
