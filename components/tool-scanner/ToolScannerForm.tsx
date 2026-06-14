'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SparklesIcon, AlertTriangleIcon, GlobeIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type StreamState =
  | { stage: 'idle' }
  | { stage: 'running'; completed: number; total: number; currentCategory: string | null }
  | { stage: 'error'; message: string }

export function ToolScannerForm() {
  const router = useRouter()
  const [platformName, setPlatformName] = React.useState('')
  const [url, setUrl] = React.useState('')
  const [state, setState] = React.useState<StreamState>({ stage: 'idle' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!platformName.trim() || !url.trim()) return

    setState({ stage: 'running', completed: 0, total: 0, currentCategory: null })

    let res: Response
    try {
      res = await fetch('/api/tool-scanner/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformName: platformName.trim(), url: url.trim() }),
      })
    } catch (err) {
      setState({ stage: 'error', message: err instanceof Error ? err.message : 'Network error' })
      return
    }

    if (!res.ok || !res.body) {
      let message = `Request failed (${res.status})`
      try {
        const data = await res.json()
        message = data.error ?? message
      } catch {}
      setState({ stage: 'error', message })
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const evt of events) {
        const line = evt.split('\n').find((l) => l.startsWith('data: '))
        if (!line) continue
        const json = line.slice(6)
        try {
          const data = JSON.parse(json) as Record<string, unknown>
          if (data.type === 'start') {
            setState({
              stage: 'running',
              completed: 0,
              total: Number(data.totalCategories ?? 0),
              currentCategory: null,
            })
          } else if (data.type === 'category') {
            setState({
              stage: 'running',
              completed: Number(data.completed ?? 0),
              total: Number(data.total ?? 0),
              currentCategory: String(data.category ?? ''),
            })
          } else if (data.type === 'complete') {
            router.push(`/tool-scanner/${data.evaluationId}`)
            router.refresh()
            return
          } else if (data.type === 'error') {
            setState({ stage: 'error', message: String(data.message ?? 'Evaluation failed') })
            return
          }
        } catch {
          // ignore malformed event
        }
      }
    }
  }

  const isRunning = state.stage === 'running'
  const progressPct = isRunning && state.total > 0 ? (state.completed / state.total) * 100 : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-stone-200/80 bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">
          Run a new evaluation
        </h2>
        <p className="mt-0.5 text-[12.5px] text-stone-500">
          AI investigates public web sources and screens against the 50-point AI screening checklist
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
            disabled={isRunning}
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
            disabled={isRunning}
            required
          />
        </div>
      </div>

      {state.stage === 'running' && (
        <div className="space-y-2 rounded-lg bg-emerald-50/60 px-4 py-3 ring-1 ring-emerald-700/15">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="font-medium text-emerald-950">
              {state.currentCategory
                ? `Screening: ${state.currentCategory}…`
                : 'Investigating platform…'}
            </span>
            <span className="font-mono tabular-nums text-emerald-800/80">
              {state.completed} / {state.total || '…'}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-emerald-900/10">
            <div
              className="h-full bg-emerald-700 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {state.stage === 'error' && (
        <div className="flex items-start gap-2.5 rounded-lg bg-amber-50/60 px-3 py-2.5 ring-1 ring-amber-700/20">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-800" />
          <p className="text-[13px] font-medium text-amber-900">{state.message}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isRunning || !platformName.trim() || !url.trim()}>
          <SparklesIcon className="mr-1.5 size-3.5" />
          {isRunning ? 'Evaluating…' : 'Run Evaluation'}
        </Button>
        <p className="flex items-center gap-1.5 text-[11.5px] text-stone-500">
          <GlobeIcon className="size-3" />
          Powered by AI. Uses publicly available information.
        </p>
      </div>
    </form>
  )
}
