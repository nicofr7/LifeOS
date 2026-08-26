"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Trash2,
} from "lucide-react"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface ParsedRow {
  [key: string]: string
}

interface ImportResult {
  imported: number
  errors: { row: number; error: string }[]
  total: number
}

export default function ImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  // Column mappings
  const [mappings, setMappings] = useState({
    name: "",
    monthlyCost: "",
    category: "",
    billingFrequency: "",
    provider: "",
    notes: "",
  })

  const requiredFields = [
    { key: "name", label: "Name" },
    { key: "monthlyCost", label: "Monthly Cost" },
  ]

  const optionalFields = [
    { key: "category", label: "Category" },
    { key: "billingFrequency", label: "Billing Frequency" },
    { key: "provider", label: "Provider" },
    { key: "notes", label: "Notes" },
  ]

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setLoading(true)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(selectedFile)
  }

  function parseCSV(text: string) {
    const lines = text.split("\n").filter((line) => line.trim())
    if (lines.length < 2) {
      setLoading(false)
      return
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
    const rows: ParsedRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
      const row: ParsedRow = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ""
      })
      rows.push(row)
    }

    setHeaders(headers)
    setParsedData(rows)

    // Auto-detect mappings
    const autoMappings: typeof mappings = {
      name: "",
      monthlyCost: "",
      category: "",
      billingFrequency: "",
      provider: "",
      notes: "",
    }

    const namePatterns = ["name", "expense", "subscription", "service", "description"]
    const costPatterns = ["cost", "price", "amount", "monthly", "fee", "charge"]
    const categoryPatterns = ["category", "type", "group"]
    const frequencyPatterns = ["frequency", "billing", "interval", "cycle"]
    const providerPatterns = ["provider", "company", "vendor", "merchant"]
    const notesPatterns = ["notes", "note", "comments", "comment"]

    headers.forEach((header) => {
      const lower = header.toLowerCase()
      if (!autoMappings.name && namePatterns.some((p) => lower.includes(p))) {
        autoMappings.name = header
      }
      if (!autoMappings.monthlyCost && costPatterns.some((p) => lower.includes(p))) {
        autoMappings.monthlyCost = header
      }
      if (!autoMappings.category && categoryPatterns.some((p) => lower.includes(p))) {
        autoMappings.category = header
      }
      if (!autoMappings.billingFrequency && frequencyPatterns.some((p) => lower.includes(p))) {
        autoMappings.billingFrequency = header
      }
      if (!autoMappings.provider && providerPatterns.some((p) => lower.includes(p))) {
        autoMappings.provider = header
      }
      if (!autoMappings.notes && notesPatterns.some((p) => lower.includes(p))) {
        autoMappings.notes = header
      }
    })

    setMappings(autoMappings)
    setLoading(false)
  }

  async function handleImport() {
    if (!mappings.name || !mappings.monthlyCost) {
      alert("Please map at least Name and Monthly Cost columns")
      return
    }

    setImporting(true)
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses: parsedData,
          mappings,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data)
      }
    } catch (err) {
      console.error("Import failed:", err)
    } finally {
      setImporting(false)
    }
  }

  function handleReset() {
    setFile(null)
    setParsedData([])
    setHeaders([])
    setResult(null)
    setMappings({
      name: "",
      monthlyCost: "",
      category: "",
      billingFrequency: "",
      provider: "",
      notes: "",
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Import Expenses</h1>
        <p className="text-muted mt-1">
          Import recurring expenses from a CSV file
        </p>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`card ${
            result.errors.length > 0 ? "border-warning" : "border-success"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            {result.errors.length > 0 ? (
              <AlertTriangle className="w-6 h-6 text-warning" />
            ) : (
              <CheckCircle className="w-6 h-6 text-success" />
            )}
            <h2 className="font-semibold">Import Complete</h2>
          </div>
          <div className="space-y-2">
            <p>
              Successfully imported{" "}
              <span className="font-bold text-success">{result.imported}</span>{" "}
              of {result.total} expenses
            </p>
            {result.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-warning mb-2">
                  Errors ({result.errors.length}):
                </p>
                <div className="space-y-1">
                  {result.errors.map((err, idx) => (
                    <p key={idx} className="text-sm text-muted">
                      Row {err.row}: {err.error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => router.push("/expenses")}
              className="btn btn-primary"
            >
              View Expenses
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={handleReset} className="btn btn-outline">
              Import More
            </button>
          </div>
        </div>
      )}

      {/* Upload area */}
      {!file && !result && (
        <div className="card">
          <div
            className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Upload CSV file</h3>
            <p className="text-sm text-muted mb-4">
              Drag and drop or click to select a CSV file containing your
              recurring expenses
            </p>
            <p className="text-xs text-muted">
              Supported format: CSV with headers in the first row
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card text-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted">Parsing CSV file...</p>
        </div>
      )}

      {/* Preview and mapping */}
      {parsedData.length > 0 && !loading && !result && (
        <>
          {/* File info */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{file?.name}</p>
                  <p className="text-sm text-muted">
                    {parsedData.length} rows • {headers.length} columns
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="btn btn-ghost text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          </div>

          {/* Column mapping */}
          <div className="card">
            <h2 className="font-semibold mb-4">Map Columns</h2>
            <p className="text-sm text-muted mb-4">
              Map your CSV columns to expense fields. Columns were auto-detected
              based on header names.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Required Fields</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {requiredFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm text-muted mb-1">
                        {field.label} *
                      </label>
                      <select
                        value={mappings[field.key as keyof typeof mappings]}
                        onChange={(e) =>
                          setMappings({
                            ...mappings,
                            [field.key]: e.target.value,
                          })
                        }
                        className="select"
                        required
                      >
                        <option value="">Select column...</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Optional Fields</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {optionalFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm text-muted mb-1">
                        {field.label}
                      </label>
                      <select
                        value={mappings[field.key as keyof typeof mappings]}
                        onChange={(e) =>
                          setMappings({
                            ...mappings,
                            [field.key]: e.target.value,
                          })
                        }
                        className="select"
                      >
                        <option value="">Select column...</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="card">
            <h2 className="font-semibold mb-4">Preview</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted">#</th>
                    {mappings.name && (
                      <th className="text-left py-2 px-3 font-medium text-muted">Name</th>
                    )}
                    {mappings.monthlyCost && (
                      <th className="text-left py-2 px-3 font-medium text-muted">Cost</th>
                    )}
                    {mappings.category && (
                      <th className="text-left py-2 px-3 font-medium text-muted">Category</th>
                    )}
                    {mappings.provider && (
                      <th className="text-left py-2 px-3 font-medium text-muted">Provider</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2 px-3 text-muted">{idx + 1}</td>
                      {mappings.name && (
                        <td className="py-2 px-3 font-medium">
                          {row[mappings.name] || "-"}
                        </td>
                      )}
                      {mappings.monthlyCost && (
                        <td className="py-2 px-3">
                          {row[mappings.monthlyCost]
                            ? formatCurrency(parseFloat(row[mappings.monthlyCost]) || 0)
                            : "-"}
                        </td>
                      )}
                      {mappings.category && (
                        <td className="py-2 px-3">{row[mappings.category] || "-"}</td>
                      )}
                      {mappings.provider && (
                        <td className="py-2 px-3">{row[mappings.provider] || "-"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.length > 10 && (
              <p className="text-sm text-muted mt-4">
                Showing 10 of {parsedData.length} rows
              </p>
            )}
          </div>

          {/* Import button */}
          <div className="flex gap-3">
            <button onClick={handleReset} className="btn btn-outline">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || !mappings.name || !mappings.monthlyCost}
              className="btn btn-primary"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Import {parsedData.length} Expenses
            </button>
          </div>
        </>
      )}
    </div>
  )
}
