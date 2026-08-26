"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Loader2, Check, ExternalLink, Copy } from "lucide-react"
import { LifeOSLogo } from "@/components/logo"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [devMode, setDevMode] = useState(false)
  const [resetUrl, setResetUrl] = useState("")
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }

      setSubmitted(true)

      if (data.devMode && data.resetUrl) {
        setDevMode(true)
        setResetUrl(data.resetUrl)
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(resetUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (submitted && !devMode) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-10 h-10 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-5 h-5 text-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Check your email</h1>
          <p className="text-sm text-muted mb-6">
            If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
          </p>
          <Link href="/login" className="btn btn-outline w-full">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <LifeOSLogo className="w-12 h-12 mb-3" />
          <div className="flex items-baseline">
            <span className="font-bold text-xl tracking-tight">Life</span>
            <span className="font-bold text-xl tracking-tight text-secondary">OS</span>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-center mb-1">Reset your password</h1>
        <p className="text-sm text-muted text-center mb-6">
          Enter your email and we&apos;ll send you a reset link
        </p>

        {devMode && resetUrl && (
          <div className="mb-4 p-3 bg-surface border border-border rounded-md">
            <p className="text-xs font-medium mb-2">Dev mode — reset link:</p>
            <div className="flex items-center gap-2">
              <a
                href={resetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary text-xs flex-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open link
              </a>
              <button
                onClick={copyToClipboard}
                className="btn btn-outline text-xs"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div>
            <label className="text-xs font-medium text-muted block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Send reset link"
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
