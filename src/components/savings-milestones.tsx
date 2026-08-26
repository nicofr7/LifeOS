"use client"

import { useMemo } from "react"
import {
  Trophy,
  Star,
  Target,
  TrendingUp,
  Award,
  Flame,
  Zap,
  Crown,
} from "lucide-react"

interface SavingsMilestonesProps {
  stats: {
    totalSaved: number
    expensesTracked: number
    recommendationsCompleted: number
    monthsActive: number
    largestSaving: number
    streakDays: number
  }
}

interface Milestone {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  threshold: number
  current: number
  achieved: boolean
  category: "savings" | "tracking" | "actions" | "streak"
}

function generateMilestones(stats: SavingsMilestonesProps["stats"]): Milestone[] {
  const milestones: Milestone[] = []

  // Savings milestones
  milestones.push(
    {
      id: "savings-100",
      title: "First $100 Saved",
      description: "Your first savings milestone",
      icon: <Star className="w-5 h-5" />,
      threshold: 100,
      current: stats.totalSaved,
      achieved: stats.totalSaved >= 100,
      category: "savings",
    },
    {
      id: "savings-500",
      title: "Savings Sprint",
      description: "Saved $500 in total",
      icon: <TrendingUp className="w-5 h-5" />,
      threshold: 500,
      current: stats.totalSaved,
      achieved: stats.totalSaved >= 500,
      category: "savings",
    },
    {
      id: "savings-1000",
      title: "Savings Champion",
      description: "Reached $1,000 in savings",
      icon: <Trophy className="w-5 h-5" />,
      threshold: 1000,
      current: stats.totalSaved,
      achieved: stats.totalSaved >= 1000,
      category: "savings",
    },
    {
      id: "savings-5000",
      title: "Savings Master",
      description: "Accumulated $5,000 in savings",
      icon: <Crown className="w-5 h-5" />,
      threshold: 5000,
      current: stats.totalSaved,
      achieved: stats.totalSaved >= 5000,
      category: "savings",
    }
  )

  // Tracking milestones
  milestones.push(
    {
      id: "track-5",
      title: "Getting Started",
      description: "Tracked 5 recurring expenses",
      icon: <Target className="w-5 h-5" />,
      threshold: 5,
      current: stats.expensesTracked,
      achieved: stats.expensesTracked >= 5,
      category: "tracking",
    },
    {
      id: "track-15",
      title: "Pro Tracker",
      description: "Tracked 15 recurring expenses",
      icon: <Zap className="w-5 h-5" />,
      threshold: 15,
      current: stats.expensesTracked,
      achieved: stats.expensesTracked >= 15,
      category: "tracking",
    }
  )

  // Action milestones
  milestones.push(
    {
      id: "action-1",
      title: "First Action",
      description: "Completed your first recommendation",
      icon: <Award className="w-5 h-5" />,
      threshold: 1,
      current: stats.recommendationsCompleted,
      achieved: stats.recommendationsCompleted >= 1,
      category: "actions",
    },
    {
      id: "action-5",
      title: "Action Hero",
      description: "Completed 5 recommendations",
      icon: <Flame className="w-5 h-5" />,
      threshold: 5,
      current: stats.recommendationsCompleted,
      achieved: stats.recommendationsCompleted >= 5,
      category: "actions",
    }
  )

  return milestones
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function SavingsMilestones({ stats }: SavingsMilestonesProps) {
  const milestones = useMemo(() => generateMilestones(stats), [stats])
  
  const achievedCount = milestones.filter(m => m.achieved).length
  const totalCount = milestones.length
  const progress = totalCount > 0 ? (achievedCount / totalCount) * 100 : 0

  // Get next milestone
  const nextMilestone = milestones
    .filter(m => !m.achieved)
    .sort((a, b) => (a.threshold - a.current) - (b.threshold - b.current))[0]

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Savings Milestones
        </h3>
        <span className="text-sm text-muted">
          {achievedCount}/{totalCount} achieved
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted mb-1">
          <span>Overall Progress</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-surface-hover rounded-full h-2">
          <div
            className="progress-bar h-2"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Next Milestone */}
      {nextMilestone && (
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 mb-6">
          <p className="text-xs text-muted mb-1">Next Milestone</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              {nextMilestone.icon}
            </div>
            <div className="flex-1">
              <p className="font-medium">{nextMilestone.title}</p>
              <p className="text-sm text-muted">{nextMilestone.description}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {formatCurrency(nextMilestone.current)} / {formatCurrency(nextMilestone.threshold)}
              </p>
              <p className="text-xs text-muted">
                {formatCurrency(nextMilestone.threshold - nextMilestone.current)} to go
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-surface-hover rounded-full h-1.5">
              <div
                className="progress-bar h-1.5"
                style={{
                  width: `${Math.min(100, (nextMilestone.current / nextMilestone.threshold) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* All Milestones */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className={`p-3 rounded-lg border text-center transition-all ${
              milestone.achieved
                ? "border-success bg-success/5"
                : "border-border hover:border-border-dark"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
              milestone.achieved
                ? "bg-success/10 text-success"
                : "bg-surface-hover text-muted"
            }`}>
              {milestone.icon}
            </div>
            <p className="text-xs font-medium mb-1">{milestone.title}</p>
            <p className="text-xs text-muted">{milestone.description}</p>
            {milestone.achieved && (
              <p className="text-xs text-success font-medium mt-1">Achieved!</p>
            )}
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalSaved)}</p>
          <p className="text-xs text-muted">Total Saved</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-secondary">{stats.expensesTracked}</p>
          <p className="text-xs text-muted">Expenses Tracked</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-success">{stats.recommendationsCompleted}</p>
          <p className="text-xs text-muted">Actions Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-info">{stats.monthsActive}</p>
          <p className="text-xs text-muted">Months Active</p>
        </div>
      </div>
    </div>
  )
}
