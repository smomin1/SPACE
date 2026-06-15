'use client'

import * as React from 'react'
import { SparklesIcon, AlertTriangleIcon, GlobeIcon, CheckCircle2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormState =
  | { stage: 'idle' }
  | { stage: 'submitting' }
  | { stage: 'queued'; platformName: string }
  | { stage: 'error'; message: string }

export function ToolScannerForm({ onQueued }: { onQueued?: () => void }) {
  const [platformName, setPlatformName] = React.useState('')
  const [url, setUrl] = React.useState('')
  const [state, setState] = React.useState<FormState>({ stage: 'idle' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = platformName.trim()
    const link = url.trim()
    if (!name || !link) return

    setState({ stage: 'submitting' })

    let res: Response
    try {
      res = await fetch('/api/tool-scanner/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformName: name, url: link }),
      })
    } catch (err) {
      setState({ stage: 'error', message: err instanceof Error ? err.message : 'Network error' })
      return
    }

    if (!res.ok) {
      let message = `Request failed (${res.status})`
      try {
        const data = await res.json()
        message = data.error ?? message
      } catch {}
      setState({ stage: 'error', message })
      return
    }

    // Queued for background scanning. Clear inputs and let the parent refetch.
    setPlatformName('')
    setUrl('')
    setState({ stage: 'queued', platformName: name })
    onQueued?.()
  }

  const isSubmitting = state.stage === 'submitting'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-stone-200/80 bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">
          Run a new evaluation
        </h2>
        <p className="mt-0.5 text-[12.5px] text-stone-500">
          AI investigates public web sources and screens against the 50-point AI screening checklist.
          Scans run in the background and are queued one at a time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="platformName" className="text-[12.5px] text-emerald-950">
            Platform Name
          </Label>
          <Input
            id="platformName"
            placeholder="e.g. Duolingo"
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="url" className="text-[12.5px] text-emerald-950">
            Website URL
          </Label>
          <Input
            id="url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      {state.stage === 'queued' && (
        <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50/60 px-3 py-2.5 ring-1 ring-emerald-700/15">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-700" />
          <p className="text-[13px] font-medium text-emerald-900">
            <strong>{state.platformName}</strong> added to the queue. It will scan in the
            background. You can leave this page.
          </p>
        </div>
      )}

      {state.stage === 'error' && (
        <div className="flex items-start gap-2.5 rounded-lg bg-amber-50/60 px-3 py-2.5 ring-1 ring-amber-700/20">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-800" />
          <p className="text-[13px] font-medium text-amber-900">{state.message}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting || !platformName.trim() || !url.trim()}>
          <SparklesIcon className="mr-1.5 size-3.5" />
          {isSubmitting ? 'Adding…' : 'Add to Queue'}
        </Button>
        <p className="flex items-center gap-1.5 text-[11.5px] text-stone-500">
          <GlobeIcon className="size-3" />
          Powered by AI. Uses publicly available information.
        </p>
      </div>
    </form>
  )
}
