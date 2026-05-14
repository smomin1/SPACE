'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { EvaluatorType } from '@prisma/client'

type Requirement = {
  id: string
  title: string
  category: string | null
  weight: 'HIGH' | 'MEDIUM' | 'LOW'
  isComplianceGate: boolean
}

type ScoreRow = {
  requirementId: string
  value: number | null
  userId: string
  user: { id: string; name: string | null }
}

type Platform = {
  id: string
  name: string
  vendor: string
  status: string
}

type Props = {
  evaluationId: string
  requirements: Requirement[]
  allScores: ScoreRow[]
  evaluatorTypeByUser: Record<string, EvaluatorType>
  platform: Platform
  lockedAt: string
  isAdmin: boolean
}

const WEIGHT_MULTIPLIER: Record<string, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function fmt(n: number | null): string {
  if (n === null) return '—'
  return n.toFixed(2)
}

export function FinalisedView({
  evaluationId,
  requirements,
  allScores,
  evaluatorTypeByUser,
  platform,
  lockedAt,
  isAdmin,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isDisqualified = platform.status === 'DISQUALIFIED'

  // Build score lookup: requirementId → { pedagogy: number[], technical: number[] }
  type TeamScores = { pedagogy: number[]; technical: number[] }
  const scoresByReq = new Map<string, TeamScores>()
  for (const s of allScores) {
    if (s.value === null) continue
    const type = evaluatorTypeByUser[s.userId]
    if (!type) continue
    const entry = scoresByReq.get(s.requirementId) ?? { pedagogy: [], technical: [] }
    if (type === 'PEDAGOGY') entry.pedagogy.push(s.value)
    else if (type === 'TECHNICAL') entry.technical.push(s.value)
    scoresByReq.set(s.requirementId, entry)
  }

  function combinedAvg(reqId: string): number | null {
    const entry = scoresByReq.get(reqId)
    if (!entry) return null
    const all = [...entry.pedagogy, ...entry.technical]
    return avg(all)
  }

  // Weighted grand total: sum(avg × multiplier) / sum(multiplier for scored reqs)
  let weightedSum = 0
  let weightedDenom = 0
  for (const req of requirements) {
    const c = combinedAvg(req.id)
    if (c === null) continue
    const m = WEIGHT_MULTIPLIER[req.weight] ?? 1
    weightedSum += c * m
    weightedDenom += m
  }
  const grandTotal = weightedDenom > 0 ? (weightedSum / weightedDenom) : null

  const categories = [...new Set(requirements.map(r => r.category ?? 'General'))].sort()

  function handleReopen() {
    startTransition(async () => {
      const res = await fetch(`/api/evaluations/${evaluationId}/reopen`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to reopen')
        return
      }
      toast.success('Evaluation reopened')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Locked banner */}
      <div className="flex items-center gap-3 rounded-lg border bg-green-50 dark:bg-green-950/20 px-4 py-3">
        <svg
          className="size-4 text-green-600 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Finalised — scores are locked
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            Locked on {new Date(lockedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
          </p>
        </div>
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={isPending}>
                Reopen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reopen this evaluation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will unlock the evaluation and allow evaluators to update scores. An audit
                  record will be created. This action cannot be undone automatically.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReopen}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Reopen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Disqualification banner */}
      {isDisqualified && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">Platform Disqualified</p>
          <p className="text-xs text-destructive/80 mt-0.5">
            This platform failed one or more compliance gate requirements and has been disqualified
            from scoring.
          </p>
        </div>
      )}

      {/* Grand total */}
      {!isDisqualified && (
        <div className="rounded-lg border bg-card px-4 py-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Weighted Score
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {grandTotal !== null ? (grandTotal / 3 * 100).toFixed(1) : '—'}
              {grandTotal !== null && (
                <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>
              )}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Raw avg: {fmt(grandTotal)} / 3 · Weights: HIGH×3, MEDIUM×2, LOW×1
          </p>
        </div>
      )}

      {/* Per-category tables */}
      {categories.map(category => {
        const catReqs = requirements.filter(r => (r.category ?? 'General') === category)

        // Category subtotal
        let catSum = 0
        let catDenom = 0
        for (const req of catReqs) {
          const c = combinedAvg(req.id)
          if (c === null) continue
          const m = WEIGHT_MULTIPLIER[req.weight] ?? 1
          catSum += c * m
          catDenom += m
        }
        const catTotal = catDenom > 0 ? catSum / catDenom : null

        return (
          <section key={category}>
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h2>
              {catTotal !== null && (
                <span className="text-xs text-muted-foreground">
                  avg {fmt(catTotal)} / 3
                </span>
              )}
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Requirement</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Pedagogy avg</TableHead>
                    <TableHead>Technical avg</TableHead>
                    <TableHead>Combined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catReqs.map(req => {
                    const entry = scoresByReq.get(req.id) ?? { pedagogy: [], technical: [] }
                    const pAvg = avg(entry.pedagogy)
                    const tAvg = avg(entry.technical)
                    const combined = combinedAvg(req.id)
                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium">{req.title}</span>
                            {req.isComplianceGate && (
                              <span className="inline-flex items-center rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive ring-1 ring-inset ring-destructive/30">
                                Gate
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{req.weight}</span>
                        </TableCell>
                        <TableCell>
                          <span className="tabular-nums text-sm">{fmt(pAvg)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="tabular-nums text-sm">{fmt(tAvg)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="tabular-nums text-sm font-medium">{fmt(combined)}</span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
