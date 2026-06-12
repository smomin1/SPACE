'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardPlusIcon, CheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type GapRequirement = {
  id: string
  title: string
  description: string
  evaluatorType: string
  weight: string
  isComplianceGate: boolean
  category: string | null
  order: number
}

type GapEvaluation = {
  id: string
  state: string
  platform: { id: string; name: string; vendor: string }
}

const VALUE_OPTIONS = [
  { label: 'N/A', value: null },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
]

type ScoreEntry = {
  value: number | null
  comment: string
}

function GapScoringDialog({
  evaluation,
  gapCount,
}: {
  evaluation: { id: string; state: string; platform: { name: string; vendor: string } }
  gapCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [gaps, setGaps] = React.useState<GapRequirement[]>([])
  const [scores, setScores] = React.useState<Record<string, ScoreEntry>>({})
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [reopening, setReopening] = React.useState(false)

  async function openDialog() {
    setOpen(true)
    setLoading(true)
    try {
      const res = await fetch(`/api/evaluations/${evaluation.id}/gaps`)
      const data = await res.json()
      setGaps(data.gaps ?? [])
      const initial: Record<string, ScoreEntry> = {}
      for (const g of (data.gaps ?? [])) {
        initial[g.id] = { value: null, comment: '' }
      }
      setScores(initial)
    } finally {
      setLoading(false)
    }
  }

  function setScore(reqId: string, patch: Partial<ScoreEntry>) {
    setScores((prev) => ({ ...prev, [reqId]: { ...prev[reqId], ...patch } }))
  }

  async function handleSubmit() {
    const payload = gaps.map((g) => ({
      requirementId: g.id,
      value: scores[g.id]?.value ?? null,
      comment: scores[g.id]?.comment || null,
    }))

    setSubmitting(true)
    try {
      const res = await fetch(`/api/evaluations/${evaluation.id}/gaps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: payload }),
      })
      if (res.ok) {
        toast.success(`Scores saved for ${payload.length} requirement${payload.length === 1 ? '' : 's'}`)
        setOpen(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to save scores')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReopen() {
    setReopening(true)
    try {
      const res = await fetch(`/api/evaluations/${evaluation.id}/reopen`, { method: 'POST' })
      if (res.ok) {
        toast.success('Evaluation reopened - evaluators can now score the new requirements')
        setOpen(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to reopen evaluation')
      }
    } finally {
      setReopening(false)
    }
  }

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); openDialog() }}
        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-300/60 hover:bg-amber-100 transition-colors"
        title={`${gapCount} new requirement${gapCount === 1 ? '' : 's'} need scoring`}
      >
        <ClipboardPlusIcon className="size-3" />
        {gapCount} gap{gapCount === 1 ? '' : 's'}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-[18px] text-emerald-950">
              Gap requirements - {evaluation.platform.name}
            </DialogTitle>
            <DialogDescription>
              These requirements were added after this evaluation was created and have no scores yet.
              Score them as admin, or reopen the evaluation so evaluators can score them.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4 py-2">
            {loading ? (
              <p className="text-sm text-stone-400 py-8 text-center">Loading...</p>
            ) : gaps.length === 0 ? (
              <p className="text-sm text-stone-400 py-8 text-center">No gap requirements found.</p>
            ) : (
              gaps.map((g) => (
                <div key={g.id} className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-emerald-950">{g.title}</span>
                      {g.isComplianceGate && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 ring-1 ring-inset ring-amber-300/60 px-2 h-[18px] text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                          Gate
                        </span>
                      )}
                      <span className="text-[11px] text-stone-400 ml-auto">{g.evaluatorType} · {g.weight}</span>
                    </div>
                    {g.description && (
                      <p className="text-[12px] text-stone-500 mt-1 line-clamp-2">{g.description}</p>
                    )}
                  </div>

                  {/* Score */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Score</p>
                    <div className="flex gap-1">
                      {VALUE_OPTIONS.map((opt) => (
                        <button
                          key={String(opt.value)}
                          onClick={() => setScore(g.id, { value: opt.value })}
                          className={cn(
                            'h-7 w-10 rounded-md text-[12px] font-medium border transition-colors',
                            scores[g.id]?.value === opt.value
                              ? 'bg-emerald-900 border-emerald-900 text-white'
                              : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <textarea
                    value={scores[g.id]?.comment ?? ''}
                    onChange={(e) => setScore(g.id, { comment: e.target.value })}
                    placeholder="Notes (optional)"
                    rows={2}
                    maxLength={2000}
                    className="w-full resize-none rounded-md border border-stone-200 bg-white px-3 py-2 text-[12.5px] text-stone-700 placeholder:text-stone-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              ))
            )}
          </div>

          <DialogFooter className="flex items-center gap-2 pt-2 border-t border-stone-100">
            <Button
              variant="outline"
              size="sm"
              className="mr-auto text-stone-600"
              disabled={reopening || submitting || loading}
              onClick={handleReopen}
            >
              {reopening ? 'Reopening...' : 'Reopen for evaluators'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting || reopening}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={submitting || reopening || loading || gaps.length === 0}
              onClick={handleSubmit}
            >
              <CheckIcon className="size-3.5 mr-1.5" />
              {submitting ? 'Saving...' : `Save ${gaps.length} score${gaps.length === 1 ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export type GapCounts = Record<string, number> // evaluationId -> gap count

export function GapBadge({
  evaluationId,
  gapCount,
  evaluation,
}: {
  evaluationId: string
  gapCount: number
  evaluation: GapEvaluation
}) {
  if (gapCount === 0) return null
  return (
    <GapScoringDialog
      evaluation={evaluation}
      gapCount={gapCount}
    />
  )
}
