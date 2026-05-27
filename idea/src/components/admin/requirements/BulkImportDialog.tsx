"use client"

import * as React from "react"
import {
  UploadIcon,
  CheckCircleIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  AlertTriangleIcon,
} from "lucide-react"
import * as XLSX from "xlsx"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface RowFailure {
  row: number
  errors: string[]
}

type ImportStep = "idle" | "uploading" | "results"

interface BulkImportDialogProps {
  onSuccess?: () => void
}

export function BulkImportDialog({ onSuccess }: BulkImportDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<ImportStep>("idle")
  const [file, setFile] = React.useState<File | null>(null)
  const [importedCount, setImportedCount] = React.useState(0)
  const [skippedCount, setSkippedCount] = React.useState(0)
  const [failures, setFailures] = React.useState<RowFailure[]>([])
  const [globalError, setGlobalError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function resetState() {
    setStep("idle")
    setFile(null)
    setImportedCount(0)
    setSkippedCount(0)
    setFailures([])
    setGlobalError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (!value) resetState()
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["title", "description", "evaluatorType", "weight", "isComplianceGate", "category", "order"],
      ["Example requirement", "Example description", "BOTH", "HIGH", "false", "General", 1],
      ["Another requirement", "Another description", "PEDAGOGY", "MEDIUM", "false", "Curriculum", 2],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Requirements")
    XLSX.writeFile(wb, "requirements-template.xlsx")
  }

  async function handleImport() {
    if (!file) return
    setStep("uploading")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/admin/requirements/bulk", {
        method: "POST",
        body: formData,
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setImportedCount(data.imported ?? 0)
        setSkippedCount(data.skipped ?? 0)
        setFailures([])
        setGlobalError(null)
        onSuccess?.()
      } else if (data.failures) {
        setFailures(data.failures)
        setGlobalError(null)
      } else {
        setGlobalError(data.error ?? "An unexpected error occurred")
        setFailures([])
      }
    } catch {
      setGlobalError("Network error — please try again")
      setFailures([])
    }

    setStep("results")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UploadIcon className="mr-1.5 size-3.5" />
          Bulk Import
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] tracking-tight text-emerald-950">
            Bulk import requirements
          </DialogTitle>
          <DialogDescription className="text-[13px] text-stone-600">
            Upload an XLSX file to import multiple requirements at once. Maximum 500 rows.
          </DialogDescription>
        </DialogHeader>

        {step === "idle" && (
          <div className="space-y-3">
            {/* Dropzone */}
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/30 px-6 py-8 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-900/[0.06] text-emerald-800 ring-1 ring-emerald-900/10">
                <UploadIcon className="size-4" />
              </div>
              <p className="mt-3 text-[13.5px] font-medium text-emerald-950">
                Select an XLSX file
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-stone-500">
                Required columns: <span className="font-mono">title, description,
                evaluatorType, weight, isComplianceGate, category, order</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                id="bulk-import-file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="mt-4 flex items-center justify-center gap-2">
                <label htmlFor="bulk-import-file">
                  <Button variant="outline" size="sm" asChild>
                    <span className="cursor-pointer">Choose file</span>
                  </Button>
                </label>
                <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                  <DownloadIcon className="mr-1.5 size-3.5" />
                  Download template
                </Button>
              </div>

              {file && (
                <p className="mt-4 inline-flex h-7 items-center gap-2 rounded-md bg-white px-3 ring-1 ring-stone-200 text-[12px] text-emerald-950">
                  <FileSpreadsheetIcon className="size-3.5 text-emerald-800/70" />
                  <span className="font-medium">{file.name}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="size-8 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
            <p className="text-[13px] text-stone-500">Importing requirements…</p>
          </div>
        )}

        {step === "results" && !globalError && failures.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/20">
              <CheckCircleIcon className="size-6" />
            </div>
            <p className="font-serif text-[20px] tracking-tight text-emerald-950">
              Import successful
            </p>
            <p className="text-[13px] text-stone-600">
              <span className="font-mono tabular-nums text-emerald-950">{importedCount}</span>{" "}
              requirement{importedCount !== 1 ? "s" : ""} imported
              {skippedCount > 0 && (
                <span className="mt-0.5 block text-[12px] text-stone-500">
                  <span className="font-mono tabular-nums">{skippedCount}</span> skipped (already exist)
                </span>
              )}
            </p>
          </div>
        )}

        {step === "results" && (globalError || failures.length > 0) && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50/60 px-3 py-2.5 ring-1 ring-amber-700/20">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-800" />
              <p className="text-[13px] font-medium text-amber-900">
                {globalError ??
                  `${failures.length} row${failures.length !== 1 ? "s" : ""} failed validation`}
              </p>
            </div>
            {failures.length > 0 && (
              <div className="max-h-60 overflow-y-auto overflow-hidden rounded-lg border border-stone-200/80">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-stone-50/60">
                      <th className="px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                        Row
                      </th>
                      <th className="px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                        Errors
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/60">
                    {failures.map((f) => (
                      <tr key={f.row}>
                        <td className="px-3 py-2 font-mono tabular-nums text-emerald-950">
                          {f.row}
                        </td>
                        <td className={cn("px-3 py-2 text-amber-900")}>
                          {f.errors.join("; ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[12px] text-stone-500">
              No rows were imported. Fix the errors in your file and try again.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "idle" && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!file}>
                Upload &amp; Import
              </Button>
            </>
          )}
          {step === "uploading" && <Button disabled>Importing…</Button>}
          {step === "results" && failures.length === 0 && !globalError && (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
          {step === "results" && (failures.length > 0 || globalError) && (
            <Button variant="outline" onClick={resetState}>
              Fix and retry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
