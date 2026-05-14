'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ProgressBar } from './ProgressBar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { EvaluatorType } from '@prisma/client'

type Requirement = {
  id: string
  title: string
  description: string
  evaluatorType: EvaluatorType
  weight: string
  isComplianceGate: boolean
  category: string | null
  order: number
}

type Score = {
  id: string
  requirementId: string
  value: number | null
  evidenceType: string | null
  comment: string | null
}

type Assignment = {
  userId: string
  evaluatorType: EvaluatorType
  hasSubmitted: boolean
  isLead?: boolean
}

type TeamMember = {
  userId: string
  name: string | null
  hasSubmitted: boolean
}

type Props = {
  evaluationId: string
  requirements: Requirement[]
  ownScores: Score[]
  assignment: Assignment
  isAdmin: boolean
  teamAssignments: TeamMember[]
  allAssignments: Assignment[]
}

const EVIDENCE_LABELS: Record<string, string> = {
  TRIAL: 'Trial',
  DEMO: 'Demo',
  DOCUMENTATION: 'Documentation',
  VENDOR_CLAIM: 'Vendor Claim',
}

const SCORE_BUTTONS = [
  { label: 'N/A', value: null },
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
]

export function ScoringForm({
  evaluationId,
  requirements,
  ownScores,
  assignment,
  isAdmin,
  teamAssignments,
  allAssignments,
}: Props) {
  const router = useRouter()
  const [scores, setScores] = useState<Map<string, Score>>(
    () => new Map(ownScores.map(s => [s.requirementId, s])),
  )
  const [savingId, setSavingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const scoredCount = [...scores.values()].filter(s => s.value !== null).length
  const allScored = scoredCount === requirements.length

  const categories = [...new Set(requirements.map(r => r.category ?? 'General'))].sort()

  async function saveScore(
    requirementId: string,
    value: number | null,
    evidenceType: string | null,
    comment: string | null,
  ) {
    setSavingId(requirementId)
    const prev = scores.get(requirementId)

    // Optimistic update
    setScores(m => {
      const next = new Map(m)
      next.set(requirementId, {
        id: prev?.id ?? '',
        requirementId,
        value,
        evidenceType,
        comment,
      })
      return next
    })

    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId, value, evidenceType, comment }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Failed to save score')
        // Revert
        setScores(m => {
          const next = new Map(m)
          if (prev) next.set(requirementId, prev)
          else next.delete(requirementId)
          return next
        })
      } else {
        const data = await res.json()
        setScores(m => {
          const next = new Map(m)
          next.set(requirementId, {
            id: data.score.id,
            requirementId,
            value,
            evidenceType,
            comment,
          })
          return next
        })
        if (data.evaluationState === 'MERGED') {
          router.refresh()
        }
      }
    } finally {
      setSavingId(null)
    }
  }

  async function handleSubmit() {
    startTransition(async () => {
      const res = await fetch(`/api/evaluations/${evaluationId}/submit`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to submit')
        return
      }
      toast.success('Scores submitted successfully')
      router.refresh()
    })
  }

  async function handleMerge() {
    startTransition(async () => {
      const res = await fetch(`/api/evaluations/${evaluationId}/merge`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to merge')
        return
      }
      toast.success('Scores merged')
      router.refresh()
    })
  }

  const submittedCount = allAssignments.filter(a => a.hasSubmitted).length

  return (
    <div className="space-y-6">
      <ProgressBar
        total={requirements.length}
        scored={scoredCount}
        hasSubmitted={assignment.hasSubmitted}
      />

      {/* Lead: team submission status panel */}
      {teamAssignments.length > 0 && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Team submissions
          </p>
          <div className="flex flex-wrap gap-2">
            {teamAssignments.map(m => (
              <span
                key={m.userId}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  m.hasSubmitted
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <span className={`size-1.5 rounded-full ${m.hasSubmitted ? 'bg-green-500' : 'bg-muted-foreground/50'}`} />
                {m.name ?? 'Unknown'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Admin: force merge override */}
      {isAdmin && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <span className="text-sm text-muted-foreground flex-1">
            {submittedCount} of {allAssignments.length} evaluator(s) submitted
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={isPending}>
                Force Merge
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Force merge scores?</AlertDialogTitle>
                <AlertDialogDescription>
                  {submittedCount < allAssignments.length
                    ? `${allAssignments.length - submittedCount} evaluator(s) have not yet submitted. Merging now will use scores submitted so far.`
                    : 'All evaluators have submitted. This will advance the evaluation to the review phase.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleMerge}>Force Merge</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {categories.map(category => {
        const catReqs = requirements.filter(r => (r.category ?? 'General') === category)
        return (
          <section key={category}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {category}
            </h2>
            <div className="space-y-3">
              {catReqs.map(req => {
                const score = scores.get(req.id)
                const isSaving = savingId === req.id

                return (
                  <div
                    key={req.id}
                    className={`rounded-lg border bg-card p-4 transition-opacity ${isSaving ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{req.title}</span>
                          {req.isComplianceGate && (
                            <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive ring-1 ring-inset ring-destructive/30">
                              Compliance Gate
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{req.weight}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {SCORE_BUTTONS.map(btn => (
                        <button
                          key={String(btn.value)}
                          onClick={() =>
                            saveScore(
                              req.id,
                              btn.value,
                              score?.evidenceType ?? null,
                              score?.comment ?? null,
                            )
                          }
                          disabled={assignment.hasSubmitted || isSaving}
                          className={`min-w-[2.5rem] rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50
                            ${
                              score?.value === btn.value
                                ? btn.value === 0
                                  ? 'border-destructive bg-destructive text-destructive-foreground'
                                  : 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background hover:bg-accent'
                            }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Select
                        value={score?.evidenceType ?? ''}
                        onValueChange={v =>
                          saveScore(req.id, score?.value ?? null, v || null, score?.comment ?? null)
                        }
                        disabled={assignment.hasSubmitted}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Evidence type…" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EVIDENCE_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Textarea
                        placeholder="Notes (optional)"
                        defaultValue={score?.comment ?? ''}
                        maxLength={2000}
                        disabled={assignment.hasSubmitted}
                        className="text-xs min-h-0 h-8 resize-none py-1.5"
                        onBlur={e =>
                          saveScore(
                            req.id,
                            score?.value ?? null,
                            score?.evidenceType ?? null,
                            e.target.value.trim() || null,
                          )
                        }
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {!assignment.hasSubmitted && (
        <div className="sticky bottom-0 bg-background border-t py-4 flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!allScored || isPending}>
                {isPending ? 'Submitting…' : 'Submit Evaluation'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit your scores?</AlertDialogTitle>
                <AlertDialogDescription>
                  Once submitted, your scores cannot be changed unless an admin reopens the
                  evaluation. You have scored all {requirements.length} requirements.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go back</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}
