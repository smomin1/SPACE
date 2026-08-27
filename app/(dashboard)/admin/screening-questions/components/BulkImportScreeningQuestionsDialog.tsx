'use client'

import * as React from 'react'
import { UploadIcon, CheckCircleIcon, XCircleIcon, DownloadIcon } from 'lucide-react'
import * as XLSX from 'xlsx'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface RowFailure {
  row: number
  errors: string[]
}

type ImportStep = 'idle' | 'uploading' | 'results'

interface BulkImportScreeningQuestionsDialogProps {
  requirementSetId: string
  requirementSetName: string
  onSuccess?: () => void
}

export function BulkImportScreeningQuestionsDialog({
  requirementSetId,
  requirementSetName,
  onSuccess,
}: BulkImportScreeningQuestionsDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<ImportStep>('idle')
  const [file, setFile] = React.useState<File | null>(null)
  const [importedCount, setImportedCount] = React.useState(0)
  const [skippedCount, setSkippedCount] = React.useState(0)
  const [failures, setFailures] = React.useState<RowFailure[]>([])
  const [globalError, setGlobalError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function resetState() {
    setStep('idle')
    setFile(null)
    setImportedCount(0)
    setSkippedCount(0)
    setFailures([])
    setGlobalError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (!value) resetState()
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['num', 'category', 'question', 'whatToLookFor', 'hardFail'],
      [1, 'Assessment', 'Does the platform provide automated grading?', 'Grading rubric, auto-score', ''],
      [2, 'Safeguarding', 'Does the platform collect data from users under 13 without consent?', 'Privacy policy, COPPA', 'IF_YES'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Screening Questions')
    XLSX.writeFile(wb, 'screening-questions-template.xlsx')
  }

  async function handleImport() {
    if (!file) return
    setStep('uploading')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('requirementSetId', requirementSetId)

    try {
      const res = await fetch('/api/screening-questions/bulk', {
        method: 'POST',
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
        setGlobalError(data.error ?? 'An unexpected error occurred')
        setFailures([])
      }
    } catch {
      setGlobalError('Network error - please try again')
      setFailures([])
    }

    setStep('results')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UploadIcon className="mr-2 size-4" />
          Bulk Import
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Screening Questions</DialogTitle>
          <DialogDescription>
            Upload an XLSX file to import multiple questions into {requirementSetName} at once.
          </DialogDescription>
        </DialogHeader>

        {step === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <UploadIcon className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="mb-1 text-sm font-medium">Select an XLSX file</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Columns: num, category, question, whatToLookFor, hardFail
                <br />
                hardFail: IF_YES, IF_NO, or blank. Max 500 rows.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                id="bulk-import-screening-file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="bulk-import-screening-file">
                <Button variant="outline" size="sm" asChild>
                  <span className="cursor-pointer">Choose File</span>
                </Button>
              </label>
              {file && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              )}
            </div>

            <Button variant="ghost" size="sm" className="w-full" onClick={downloadTemplate}>
              <DownloadIcon className="mr-2 size-4" />
              Download template
            </Button>
          </div>
        )}

        {step === 'uploading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Importing questions…</p>
          </div>
        )}

        {step === 'results' && !globalError && failures.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircleIcon className="size-12 text-green-500" />
            <p className="text-lg font-medium">Import successful</p>
            <p className="text-sm text-muted-foreground">
              {importedCount} question{importedCount !== 1 ? 's' : ''} imported into {requirementSetName}
              {skippedCount > 0 && (
                <span className="block text-xs mt-0.5">
                  {skippedCount} skipped (question number already exists in this set)
                </span>
              )}
            </p>
          </div>
        )}

        {step === 'results' && (globalError || failures.length > 0) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <XCircleIcon className="size-5" />
              <p className="font-medium">
                {globalError ?? `${failures.length} row${failures.length !== 1 ? 's' : ''} failed validation`}
              </p>
            </div>
            {failures.length > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Row</th>
                      <th className="px-3 py-2 text-left font-medium">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {failures.map((f) => (
                      <tr key={f.row}>
                        <td className="px-3 py-2 font-mono">{f.row}</td>
                        <td className="px-3 py-2 text-destructive">{f.errors.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              No rows were imported. Fix the errors in your file and try again.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'idle' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!file}>
                Upload &amp; Import
              </Button>
            </>
          )}
          {step === 'uploading' && <Button disabled>Importing…</Button>}
          {step === 'results' && failures.length === 0 && !globalError && (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
          {step === 'results' && (failures.length > 0 || globalError) && (
            <Button variant="outline" onClick={resetState}>
              Fix and retry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
