'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ProgressBar } from './ProgressBar'
import { AgeRangePanel } from './AgeRangePanel'
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

type Member = {
  userId: string
  name: string | null
  evaluatorType: EvaluatorType
  isLead: boolean
  hasSubmitted: boolean
}

type Props = {
  evaluationId: string
  requirements: Requirement[]
  ownScores: Score[]
  assignment: Assignment
  isAdmin: boolean
  allMembers: Member[]
  initialAgeMin: number | null
  initialAgeMax: number | null
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
  { label: '4', value: 4 },
]

// Compliance gate requirements use a binary Yes/No scale
// Yes = 1 (pass), No = 0 (fail - immediately disqualifies the platform)
const GATE_BUTTONS = [
  { label: 'N/A', value: null },
  { label: 'No',  value: 0 },
  { label: 'Yes', value: 1 },
]

export function ScoringForm({
  evaluationId,
  requirements,
  ownScores,
  assignment,
  isAdmin: _isAdmin,
  allMembers,
  initialAgeMin,
  initialAgeMax,
}: Props) {
  const router = useRouter()
  const [scores, setScores] = useState<Map<string, Score>>(
    () => new Map(ownScores.map(s => [s.requirementId, s])),
  )
  const [savingId, setSavingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [ageMin, setAgeMin] = useState<number | null>(initialAgeMin)
  const [ageMax, setAgeMax] = useState<number | null>(initialAgeMax)

  const isPedagogy = assignment.evaluatorType === 'PEDAGOGY'

  // After submitting, hide requirements that have no score - these are gap requirements added
  // after the user submitted and can only be handled via the admin gap panel or a reopen.
  const visibleRequirements = assignment.hasSubmitted
    ? requirements.filter(r => scores.has(r.id))
    : requirements

  // A requirement is "answered" when a score record exists for it (value may be null = N/A)
  const answeredCount = requirements.filter(r => scores.has(r.id)).length
  const allScored =
    answeredCount === requirements.length &&
    (!isPedagogy || (ageMin !== null && ageMax !== null))
  // Show numeric progress only for non-N/A responses
  const scoredCount = [...scores.values()].filter(s => s.value !== null).length

  const categories = [...new Set(visibleRequirements.map(r => r.category ?? 'General'))].sort()

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

  return (
    <div className="space-y-6">
      <ProgressBar
        total={requirements.length}
        scored={answeredCount}
        hasSubmitted={assignment.hasSubmitted}
      />

      {isPedagogy && (
        <AgeRangePanel
          evaluationId={evaluationId}
          initialAgeMin={ageMin}
          initialAgeMax={ageMax}
          disabled={assignment.hasSubmitted}
          onSaved={(min, max) => { setAgeMin(min); setAgeMax(max) }}
        />
      )}

      {/* All evaluators panel - shown always */}
      <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 px-4 py-3 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Team submissions
        </p>
        {(['PEDAGOGY', 'TECHNICAL'] as const).map(type => {
          const members = allMembers.filter(m => m.evaluatorType === type)
          if (members.length === 0) return null
          return (
            <div key={type}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-1.5">
                {type === 'PEDAGOGY' ? 'Pedagogy' : 'Technical'}
              </p>
              <div className="flex flex-wrap gap-2">
                {members.map(m => (
                  <span
                    key={m.userId}
                    className={`inline-flex items-center gap-1.5 rounded-md ring-1 ring-inset px-2 h-[22px] text-[11.5px] font-medium tracking-tight ${
                      m.hasSubmitted
                        ? 'bg-stone-100/80 ring-stone-200 text-emerald-950'
                        : 'bg-stone-50 ring-stone-200 text-stone-400'
                    }`}
                  >
                    <span className={`size-1.5 rounded-full shrink-0 ${m.hasSubmitted ? 'bg-emerald-600' : 'bg-stone-300'}`} />
                    {m.isLead && <span className="text-amber-500">★</span>}
                    {m.name ?? 'Unknown'}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
        {(() => {
          const submittedCount = allMembers.filter(m => m.hasSubmitted).length
          const totalCount = allMembers.length
          const allSubmitted = submittedCount === totalCount && totalCount > 0
          const hasPedagogySubmitted = allMembers.some(m => (m.evaluatorType === 'PEDAGOGY' || m.evaluatorType === 'BOTH') && m.hasSubmitted)
          const hasTechnicalSubmitted = allMembers.some(m => (m.evaluatorType === 'TECHNICAL' || m.evaluatorType === 'BOTH') && m.hasSubmitted)
          const canEarlyMerge = assignment.isLead && assignment.hasSubmitted && hasPedagogySubmitted && hasTechnicalSubmitted && !allSubmitted
          return (
            <div className="pt-1 border-t border-stone-200/60 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {allSubmitted
                  ? 'All evaluators submitted - merging automatically…'
                  : `${submittedCount} of ${totalCount} evaluators submitted`}
              </p>
              {canEarlyMerge && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-[12px] shrink-0">
                      Merge now
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Merge scores now?</AlertDialogTitle>
                      <AlertDialogDescription>
                        At least one evaluator from each team has submitted. You can merge early
                        and begin conflict resolution now. Evaluators who haven't submitted yet
                        will not be able to add more scores after merging.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          const res = await fetch(`/api/evaluations/${evaluationId}/merge`, { method: 'POST' })
                          const data = await res.json().catch(() => ({}))
                          if (!res.ok) {
                            toast.error(data.error ?? 'Merge failed')
                          } else {
                            toast.success('Scores merged - conflict resolution can now begin')
                            router.refresh()
                          }
                        }}
                      >
                        Merge scores
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )
        })()}
      </div>

      {categories.map(category => {
        const catReqs = visibleRequirements.filter(r => (r.category ?? 'General') === category)
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
                    className={`rounded-xl border border-stone-200/80 bg-white p-4 transition-opacity ${isSaving ? 'opacity-60' : ''}`}
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
                      {(req.isComplianceGate ? GATE_BUTTONS : SCORE_BUTTONS).map(btn => {
                        const isSelected = score?.value === btn.value && scores.has(req.id)
                        const isNo = req.isComplianceGate && btn.value === 0
                        const isYes = req.isComplianceGate && btn.value === 1
                        return (
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
                                isSelected
                                  ? isNo
                                    ? 'border-destructive bg-destructive text-destructive-foreground'
                                    : isYes
                                    ? 'border-emerald-700 bg-emerald-700 text-white'
                                    : btn.value === 0
                                    ? 'border-destructive bg-destructive text-destructive-foreground'
                                    : 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-background hover:bg-accent'
                              }`}
                          >
                            {btn.label}
                          </button>
                        )
                      })}
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
        <div className="sticky bottom-0 bg-[var(--color-neutral)] border-t border-stone-200/80 py-4 flex items-center justify-between gap-4">
          {!allScored && (
            <p className="text-xs text-muted-foreground">
              {answeredCount < requirements.length
                ? `Score all ${requirements.length} requirements`
                : isPedagogy
                ? 'Select a target age range'
                : ''}{' '}
              to submit.
            </p>
          )}
          <div className="ml-auto">
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
                  Once submitted, your scores and age range assessment cannot be changed unless
                  an admin reopens the evaluation. You have scored all {requirements.length} requirements.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go back</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </div>
      )}
    </div>
  )
}
