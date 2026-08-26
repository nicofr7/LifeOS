"use client"

import { useState, useEffect } from "react"
import {
  Target,
  Plus,
  Trash2,
  Edit,
  Loader2,
  X,
  Calendar,
  CheckCircle,
} from "lucide-react"
import { UpgradeModal } from "@/components/upgrade-modal"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  createdAt: string
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [form, setForm] = useState({
    name: "",
    targetAmount: "",
    deadline: "",
  })
  const [formError, setFormError] = useState("")
  const [formLoading, setFormLoading] = useState(false)

  // Dashboard data for calculating potential savings
  const [potentialSavings, setPotentialSavings] = useState(0)
  const [userPlan, setUserPlan] = useState<string>("free")
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    fetchGoals()
    fetchDashboard()
    fetchPlan()
  }, [])

  async function fetchGoals() {
    try {
      const res = await fetch("/api/goals")
      if (res.ok) {
        const data = await res.json()
        setGoals(data.goals)
      }
    } catch (err) {
      console.error("Failed to fetch goals:", err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/dashboard")
      if (res.ok) {
        const data = await res.json()
        setPotentialSavings(data.potentialSavings)
      }
    } catch (err) {
      console.error("Failed to fetch dashboard:", err)
    }
  }

  async function fetchPlan() {
    try {
      const res = await fetch("/api/user/plan")
      if (res.ok) {
        const data = await res.json()
        setUserPlan(data.plan)
      }
    } catch {}
  }

  const isAtGoalLimit = userPlan === "free" && goals.length >= 1

  function openAddModal() {
    if (isAtGoalLimit) {
      setShowUpgradeModal(true)
      return
    }
    setEditingGoal(null)
    setForm({ name: "", targetAmount: "", deadline: "" })
    setFormError("")
    setShowModal(true)
  }

  function openEditModal(goal: SavingsGoal) {
    setEditingGoal(goal)
    setForm({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline
        ? new Date(goal.deadline).toISOString().split("T")[0]
        : "",
    })
    setFormError("")
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setFormLoading(true)

    try {
      const body = {
        name: form.name,
        targetAmount: parseFloat(form.targetAmount),
        deadline: form.deadline || null,
      }

      if (editingGoal) {
        const res = await fetch(`/api/goals/${editingGoal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          setFormError(data.error || "Failed to update goal")
          return
        }
      } else {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          setFormError(data.error || "Failed to create goal")
          return
        }
      }

      setShowModal(false)
      fetchGoals()
    } catch {
      setFormError("Something went wrong")
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this goal?")) return

    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchGoals()
      }
    } catch (err) {
      console.error("Failed to delete goal:", err)
    }
  }

  async function handleUpdateProgress(id: string, amount: number) {
    try {
      const goal = goals.find((g) => g.id === id)
      if (!goal) return

      const newAmount = Math.max(0, goal.currentAmount + amount)
      const res = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: newAmount }),
      })
      if (res.ok) {
        fetchGoals()
      }
    } catch (err) {
      console.error("Failed to update progress:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Savings Goals</h1>
          <p className="text-muted mt-1">Track progress toward your savings targets</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Potential savings info */}
      {potentialSavings > 0 && (
        <div className="card border-success/20 bg-success/5">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-success" />
            <div>
              <p className="font-medium">
                You have {formatCurrency(potentialSavings)} in potential annual savings
              </p>
              <p className="text-sm text-muted">
                Cancel unused subscriptions and mark expenses you don&apos;t use to unlock these savings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Goal limit warning */}
      {isAtGoalLimit && (
        <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">You've reached the 1 goal limit on the Free plan</p>
            <p className="text-xs text-muted mt-0.5">Upgrade to Pro for unlimited savings goals and more.</p>
          </div>
          <a href="/pricing" className="btn btn-primary text-sm whitespace-nowrap">
            Upgrade to Pro
          </a>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="card text-center py-12">
          <Target className="w-12 h-12 text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No savings goals yet</h2>
          <p className="text-muted mb-4">
            Create a goal to track your progress toward saving money.
          </p>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const progress = goal.targetAmount > 0
              ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
              : 0
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
            const isComplete = goal.currentAmount >= goal.targetAmount

            // Estimate time to reach goal based on potential savings
            const monthlySavingsRate = potentialSavings / 12
            const monthsToGoal = monthlySavingsRate > 0
              ? Math.ceil(remaining / monthlySavingsRate)
              : null

            return (
              <div
                key={goal.id}
                className={`card ${isComplete ? "border-success bg-success/5" : ""}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isComplete ? "bg-success/10" : "bg-primary/10"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <Target className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{goal.name}</h3>
                      {goal.deadline && (
                        <p className="text-xs text-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(goal.deadline)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(goal)}
                      className="btn btn-ghost p-2"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="btn btn-ghost p-2 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted">
                      {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                    </span>
                    <span className="text-sm font-medium">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-surface-hover rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isComplete ? "bg-success" : "bg-primary"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Remaining</span>
                    <span className="font-medium">{formatCurrency(remaining)}</span>
                  </div>
                  {monthsToGoal !== null && !isComplete && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Est. time to goal</span>
                      <span className="font-medium">
                        {monthsToGoal} {monthsToGoal === 1 ? "month" : "months"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                {!isComplete && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleUpdateProgress(goal.id, 50)}
                      className="btn btn-outline text-xs flex-1"
                    >
                      +$50
                    </button>
                    <button
                      onClick={() => handleUpdateProgress(goal.id, 100)}
                      className="btn btn-outline text-xs flex-1"
                    >
                      +$100
                    </button>
                    <button
                      onClick={() => handleUpdateProgress(goal.id, 500)}
                      className="btn btn-outline text-xs flex-1"
                    >
                      +$500
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trigger="goals"
        currentCount={goals.length}
        freeLimit={1}
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">
                {editingGoal ? "Edit Goal" : "Add Goal"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-ghost p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Save for vacation, Emergency fund, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Target Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.targetAmount}
                  onChange={(e) =>
                    setForm({ ...form, targetAmount: e.target.value })
                  }
                  className="input"
                  placeholder="1000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Deadline (optional)
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn btn-primary flex-1"
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingGoal ? (
                    "Save Changes"
                  ) : (
                    "Create Goal"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
