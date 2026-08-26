"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Lock, Loader2, Check, AlertTriangle } from "lucide-react"
import { LifeOSLogo } from "@/components/logo"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [invalidToken, setInvalidToken] = useState(false)

  useEffect(() => {
    if (!token) {
      setInvalidToken(true)
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!token) {
      setError("Invalid reset token")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to reset password")
        if (data.error?.includes("expired") || data.error?.includes("already been used")) {
          setInvalidToken(true)
        }
        return
      }

      setSuccess(true)
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (invalidToken) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-10 h-10 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-5 h-5 text-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Invalid reset link</h1>
          <p className="text-sm text-muted mb-6">
            {!token
              ? "No reset token was provided. Please request a new link."
              : "This link is invalid or has expired."}
          </p>
          <Link href="/forgot-password" className="btn btn-primary w-full">
            Request new link
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-10 h-10 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-5 h-5 text-success" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Password updated</h1>
          <p className="text-sm text-muted mb-6">
            You can now log in with your new password.
          </p>
          <button
            onClick={() => window.location.href = "/login"}
            className="btn btn-primary w-full"
          >
            Go to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <LifeOSLogo className="w-12 h-12 mb-3" />
          <div className="flex items-baseline">
            <span className="font-bold text-xl tracking-tight">Life</span>
            <span className="font-bold text-xl tracking-tight text-secondary">OS</span>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-center mb-1">Create new password</h1>
        <p className="text-sm text-muted text-center mb-6">
          Enter your new password below
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div>
            <label className="text-xs font-medium text-muted block mb-1">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Min. 8 characters"
              minLength={8}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Confirm password"
              minLength={8}
              required
            />
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword || password !== confirmPassword}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Reset password"
            )}
          </button>
        </form>

        <p className="text-sm text-center text-muted mt-6">
          <Link href="/login" className="text-foreground font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-foreground animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
