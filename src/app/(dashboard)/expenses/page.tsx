"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Loader2,
  X,
  ChevronDown,
  Archive,
  RotateCcw,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Ban,
} from "lucide-react"
import { EXPENSE_CATEGORIES, BILLING_FREQUENCIES, USAGE_STATUSES, CANCELLATION_DIFFICULTIES, calculateMonthlyCost, roundMoney } from "@/lib/utils"
import { UpgradeModal } from "@/components/upgrade-modal"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface Expense {
  id: string
  name: string
  category: string
  monthlyCost: number
  billingFrequency: string
  annualCost: number
  nextBillingDate: string | null
  provider: string | null
  notes: string | null
  isEssential: boolean
  usageStatus: string
  cancellationDifficulty: string
  isArchived: boolean
  createdAt: string
}

function ExpensesPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const showAddModal = searchParams.get("action") === "add"

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [showFilters, setShowFilters] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [userPlan, setUserPlan] = useState<string>("free")
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Inline usage status editing
  const [editingUsageId, setEditingUsageId] = useState<string | null>(null)
  const [savingUsageId, setSavingUsageId] = useState<string | null>(null)

  async function handleInlineUsageChange(expenseId: string, newStatus: string) {
    setSavingUsageId(expenseId)
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usageStatus: newStatus }),
      })
      if (res.ok) {
        setExpenses(prev =>
          prev.map(e => (e.id === expenseId ? { ...e, usageStatus: newStatus } : e))
        )
      }
    } catch (err) {
      console.error("Failed to update usage status:", err)
    } finally {
      setSavingUsageId(null)
      setEditingUsageId(null)
    }
  }

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(showAddModal)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [form, setForm] = useState({
    name: "",
    category: "other",
    monthlyCost: "",
    billingFrequency: "monthly",
    nextBillingDate: "",
    provider: "",
    website: "",
    notes: "",
    isEssential: true,
    usageStatus: "active",
    cancellationDifficulty: "easy",
  })
  const [formError, setFormError] = useState("")
  const [formLoading, setFormLoading] = useState(false)

  // Close inline editor on outside click
  useEffect(() => {
    if (!editingUsageId) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-usage-editor]')) {
        setEditingUsageId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editingUsageId])

  useEffect(() => {
    fetchExpenses()
    fetchPlan()
  }, [search, categoryFilter, sortBy, sortOrder, showArchived])

  useEffect(() => {
    if (showAddModal) setShowModal(true)
  }, [showAddModal])

  async function fetchPlan() {
    try {
      const res = await fetch("/api/user/plan")
      if (res.ok) {
        const data = await res.json()
        setUserPlan(data.plan)
      }
    } catch {}
  }

  const isAtExpenseLimit = userPlan === "free" && expenses.length >= 15

  async function fetchExpenses() {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (categoryFilter) params.set("category", categoryFilter)
      params.set("sortBy", sortBy)
      params.set("sortOrder", sortOrder)
      if (showArchived) params.set("archived", "true")

      const res = await fetch(`/api/expenses?${params}`)
      if (res.ok) {
        const data = await res.json()
        setExpenses(data.expenses)
      }
    } catch (err) {
      console.error("Failed to fetch expenses:", err)
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    if (isAtExpenseLimit) {
      setShowUpgradeModal(true)
      return
    }
    setEditingExpense(null)
    setForm({
      name: "",
      category: "other",
      monthlyCost: "",
      billingFrequency: "monthly",
      nextBillingDate: "",
      provider: "",
      website: "",
      notes: "",
      isEssential: true,
      usageStatus: "active",
      cancellationDifficulty: "easy",
    })
    setFormError("")
    setShowModal(true)
  }

  function openEditModal(expense: Expense) {
    setEditingExpense(expense)
    setForm({
      name: expense.name,
      category: expense.category,
      monthlyCost: expense.monthlyCost.toString(),
      billingFrequency: expense.billingFrequency,
      nextBillingDate: expense.nextBillingDate
        ? new Date(expense.nextBillingDate).toISOString().split("T")[0]
        : "",
      provider: expense.provider || "",
      website: "",
      notes: expense.notes || "",
      isEssential: expense.isEssential,
      usageStatus: expense.usageStatus,
      cancellationDifficulty: expense.cancellationDifficulty,
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
        ...form,
        monthlyCost: parseFloat(form.monthlyCost),
        nextBillingDate: form.nextBillingDate || null,
        provider: form.provider || null,
        website: form.website || null,
        notes: form.notes || null,
      }

      if (editingExpense) {
        const res = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          setFormError(data.error || "Failed to update expense")
          return
        }
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          setFormError(data.error || "Failed to add expense")
          return
        }
      }

      setShowModal(false)
      fetchExpenses()
    } catch {
      setFormError("Something went wrong")
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this expense?")) return
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" })
      if (res.ok) fetchExpenses()
    } catch (err) {
      console.error("Failed to delete expense:", err)
    }
  }

  async function handleArchive(id: string) {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      })
      if (res.ok) fetchExpenses()
    } catch (err) {
      console.error("Failed to archive expense:", err)
    }
  }

  async function handleRestore(id: string) {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      })
      if (res.ok) fetchExpenses()
    } catch (err) {
      console.error("Failed to restore expense:", err)
    }
  }

  // Bulk actions
  function toggleSelectAll() {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(expenses.map(e => e.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkArchive() {
    if (!confirm(`Archive ${selectedIds.size} expense(s)?`)) return
    setBulkLoading(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/expenses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isArchived: true }),
          })
        )
      )
      setSelectedIds(new Set())
      fetchExpenses()
    } catch (err) {
      console.error("Bulk archive failed:", err)
    } finally {
      setBulkLoading(false)
    }
  }

  async function bulkDelete() {
    if (!confirm(`Permanently delete ${selectedIds.size} expense(s)? This cannot be undone.`)) return
    setBulkLoading(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/expenses/${id}`, { method: "DELETE" })
        )
      )
      setSelectedIds(new Set())
      fetchExpenses()
    } catch (err) {
      console.error("Bulk delete failed:", err)
    } finally {
      setBulkLoading(false)
    }
  }

  async function bulkMarkUsage(status: string) {
    setBulkLoading(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/expenses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usageStatus: status }),
          })
        )
      )
      setSelectedIds(new Set())
      fetchExpenses()
    } catch (err) {
      console.error("Bulk mark usage failed:", err)
    } finally {
      setBulkLoading(false)
    }
  }

  const totalMonthly = expenses.reduce(
    (sum, e) => sum + roundMoney(calculateMonthlyCost(e.monthlyCost, e.billingFrequency)),
    0
  )

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
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted mt-1">
            {expenses.length} expense{expenses.length !== 1 ? "s" : ""} · {formatCurrency(totalMonthly)}/month
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-foreground/5 border border-foreground/20 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => bulkMarkUsage("dont_use")}
              disabled={bulkLoading}
              className="btn btn-outline text-xs"
            >
              <Ban className="w-3.5 h-3.5" />
              Mark Don't Use
            </button>
            <button
              onClick={() => bulkMarkUsage("rarely_used")}
              disabled={bulkLoading}
              className="btn btn-outline text-xs"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Mark Rarely Used
            </button>
            <button
              onClick={() => bulkMarkUsage("active")}
              disabled={bulkLoading}
              className="btn btn-outline text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Mark Active
            </button>
            <button onClick={bulkArchive} disabled={bulkLoading} className="btn btn-outline text-xs">
              <Archive className="w-3.5 h-3.5" />
              Archive
            </button>
            <button onClick={bulkDelete} disabled={bulkLoading} className="btn btn-outline text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="btn btn-ghost text-xs">
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-outline text-sm"
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`btn text-sm ${showArchived ? "btn-primary" : "btn-outline"}`}
        >
          <Archive className="w-4 h-4" />
          {showArchived ? "Active" : "Archived"}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-surface border border-border rounded-lg p-4 animate-slide-in">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="select text-sm"
              >
                <option value="">All categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select text-sm"
              >
                <option value="createdAt">Date added</option>
                <option value="name">Name</option>
                <option value="monthlyCost">Cost</option>
                <option value="nextBillingDate">Next renewal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="select text-sm"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Limit warning */}
      {isAtExpenseLimit && (
        <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">You've reached the 15 expense limit on the Free plan</p>
            <p className="text-xs text-muted mt-0.5">Upgrade to Pro for unlimited expenses, AI analysis, and more.</p>
          </div>
          <a href="/pricing" className="btn btn-primary text-sm whitespace-nowrap">
            Upgrade to Pro
          </a>
        </div>
      )}

      {/* Expenses list */}
      {expenses.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg text-center py-12">
          <p className="text-muted mb-4">
            {showArchived ? "No archived expenses" : "No expenses found"}
          </p>
          {!showArchived && (
            <button onClick={openAddModal} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Add Your First Expense
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {/* Select all header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface-hover">
            <button onClick={toggleSelectAll} className="text-muted hover:text-foreground">
              {selectedIds.size === expenses.length && expenses.length > 0 ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <span className="text-xs text-muted">Select all</span>
          </div>

          {/* Expense rows */}
          {expenses.map((expense) => {
            const normalizedMonthly = roundMoney(calculateMonthlyCost(expense.monthlyCost, expense.billingFrequency))
            const normalizedAnnual = roundMoney(normalizedMonthly * 12)
            const isSelected = selectedIds.has(expense.id)

            return (
              <div
                key={expense.id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-surface-hover transition-colors ${
                  expense.isArchived ? "opacity-60" : ""
                } ${isSelected ? "bg-primary/5" : ""}`}
              >
                <button
                  onClick={() => toggleSelect(expense.id)}
                  className="flex-shrink-0 text-muted hover:text-foreground"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                <div
                  className="flex-1 cursor-pointer min-w-0"
                  onClick={() => router.push(`/expenses/${expense.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{expense.name}</p>
                    {expense.billingFrequency !== "monthly" && (
                      <span className="text-[10px] bg-muted/10 px-1.5 py-0.5 rounded text-muted flex-shrink-0">
                        {expense.billingFrequency}
                      </span>
                    )}
                    {expense.isArchived && (
                      <span className="text-[10px] bg-muted/20 px-1.5 py-0.5 rounded text-muted flex-shrink-0">
                        archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {expense.provider || EXPENSE_CATEGORIES.find(c => c.id === expense.category)?.name || expense.category}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Inline usage status editor */}
                  <div className="relative" data-usage-editor>
                    {editingUsageId === expense.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={expense.usageStatus}
                          onChange={(e) => handleInlineUsageChange(expense.id, e.target.value)}
                          onBlur={() => setEditingUsageId(null)}
                          autoFocus
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium border border-border bg-surface cursor-pointer min-w-[90px]"
                          disabled={savingUsageId === expense.id}
                        >
                          {USAGE_STATUSES.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                        {savingUsageId === expense.id && (
                          <Loader2 className="w-3 h-3 animate-spin text-muted" />
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingUsageId(expense.id)
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                          expense.usageStatus === "active"
                            ? "bg-success/10 text-success"
                            : expense.usageStatus === "rarely_used"
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                        }`}
                        title="Click to change usage status"
                      >
                        {USAGE_STATUSES.find((u) => u.id === expense.usageStatus)?.name || expense.usageStatus}
                      </button>
                    )}
                  </div>

                  <div className="text-right min-w-[80px]">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(normalizedMonthly)}/mo</p>
                    <p className="text-[10px] text-muted tabular-nums">{formatCurrency(normalizedAnnual)}/yr</p>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {expense.isArchived ? (
                      <button
                        onClick={() => handleRestore(expense.id)}
                        className="btn btn-ghost p-1.5"
                        title="Restore"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => openEditModal(expense)}
                        className="btn btn-ghost p-1.5"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="btn btn-ghost p-1.5 text-destructive hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trigger="expenses"
        currentCount={expenses.length}
        freeLimit={15}
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {formError && (
                <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input text-sm"
                  placeholder="Netflix, Gym, etc."
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="select text-sm"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Cost Per Cycle *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.monthlyCost}
                    onChange={(e) => setForm({ ...form, monthlyCost: e.target.value })}
                    className="input text-sm"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Billing Frequency</label>
                  <select
                    value={form.billingFrequency}
                    onChange={(e) => setForm({ ...form, billingFrequency: e.target.value })}
                    className="select text-sm"
                  >
                    {BILLING_FREQUENCIES.map((freq) => (
                      <option key={freq.id} value={freq.id}>{freq.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Next Billing Date</label>
                  <input
                    type="date"
                    value={form.nextBillingDate}
                    onChange={(e) => setForm({ ...form, nextBillingDate: e.target.value })}
                    className="input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Provider</label>
                <input
                  type="text"
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  className="input text-sm"
                  placeholder="Company or service name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Usage Status</label>
                  <select
                    value={form.usageStatus}
                    onChange={(e) => setForm({ ...form, usageStatus: e.target.value })}
                    className="select text-sm"
                  >
                    {USAGE_STATUSES.map((status) => (
                      <option key={status.id} value={status.id}>{status.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Cancellation Difficulty</label>
                  <select
                    value={form.cancellationDifficulty}
                    onChange={(e) => setForm({ ...form, cancellationDifficulty: e.target.value })}
                    className="select text-sm"
                  >
                    {CANCELLATION_DIFFICULTIES.map((diff) => (
                      <option key={diff.id} value={diff.id}>{diff.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isEssential"
                  checked={form.isEssential}
                  onChange={(e) => setForm({ ...form, isEssential: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="isEssential" className="text-sm">Essential expense</label>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input text-sm"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline flex-1 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className="btn btn-primary flex-1 text-sm">
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingExpense ? "Save Changes" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <ExpensesPageInner />
    </Suspense>
  )
}
