'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ConflictThread } from './ConflictThread'
import { Button } from '@/components/ui/button'
import { ComplianceGateBadge, WeightTier } from '@/components/admin/_shared/badges'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import type { Role } from '@prisma/client'

type Requirement = {
  id: string
  title: string
  category: string | null
  weight: string
  isComplianceGate: boolean
  evaluatorType: string
}

type ScoreRow = {
  id: string
  requirementId: string
  value: number | null
  evidenceType: string | null
  comment: string | null
  userId: string
  user: { id: string; name: string | null; role: Role }
}

type Thread = { id: string; requirementId: string; isClosed: boolean }

type Props = {
  evaluationId: string
  requirements: Requirement[]
  allScores: ScoreRow[]
  threads: Thread[]
  openThreadCount: number
  currentUserId: string
  currentUserRole: Role
  currentEvaluatorType: string | null
  isAdmin: boolean
}

const SCORE_LABELS: Record<number, string> = { 0: '0', 1: '1', 2: '2', 3: '3' }

function ScorePill({
  value,
  userName,
  evidenceType,
}: {
  value: number | null
  userName: string | null
  evidenceType: string | null
}) {
  if (value === null) {
    return (
      <span className="inline-block rounded-md px-1.5 py-0.5 text-[11px] bg-stone-100 text-stone-400 ring-1 ring-inset ring-stone-200">
        {userName ?? '?'}: N/A
      </span>
    )
  }
  return (
    <span
      className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
        value === 0
          ? 'bg-amber-50 text-amber-800 ring-amber-300/60'
          : 'bg-emerald-50 text-emerald-800 ring-emerald-200/60'
      }`}
    >
      {userName ?? '?'}: {SCORE_LABELS[value]}
      {evidenceType ? ` (${evidenceType.charAt(0) + evidenceType.slice(1).toLowerCase()})` : ''}
    </span>
  )
}

export function MergedView({
  evaluationId,
  requirements,
  allScores,
  threads,
  openThreadCount: initialOpenCount,
  currentUserId,
  currentUserRole,
  currentEvaluatorType,
  isAdmin,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [openThreadCount, setOpenThreadCount] = useState(initialOpenCount)
  const [threadDialog, setThreadDialog] = useState<{
    threadId: string
    requirementId: string
    requirementTitle: string
    evaluatorType: string
    isClosed: boolean
  } | null>(null)

  // Build maps for quick lookup
  const scoresByReq = new Map<string, ScoreRow[]>()
  for (const s of allScores) {
    const arr = scoresByReq.get(s.requirementId) ?? []
    arr.push(s)
    scoresByReq.set(s.requirementId, arr)
  }
  const threadByReq = new Map(threads.map(t => [t.requirementId, t]))

  const categories = [...new Set(requirements.map(r => r.category ?? 'General'))].sort()

  function handleFinalise() {
    startTransition(async () => {
      const res = await fetch(`/api/evaluations/${evaluationId}/finalise`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to finalise')
        return
      }
      toast.success('Evaluation finalised')
      router.refresh()
    })
  }

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

  function handleThreadClosed() {
    setOpenThreadCount(c => Math.max(0, c - 1))
    if (threadDialog) {
      setThreadDialog(prev => prev ? { ...prev, isClosed: true } : null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Admin toolbar */}
      {isAdmin && (
        <div className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-stone-50/60 px-4 py-3">
          <div className="flex-1 text-sm text-muted-foreground">
            {openThreadCount > 0 ? (
              <span className="text-amber-600 font-medium">
                {openThreadCount} open conflict{openThreadCount !== 1 ? 's' : ''} — resolve before finalising
              </span>
            ) : (
              <span>All conflicts resolved — ready to finalise</span>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={isPending}>
                Reopen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reopen evaluation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will return the evaluation to IN_PROGRESS, allowing evaluators to update scores.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReopen}>Reopen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={openThreadCount > 0 || isPending}>
                Finalise
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finalise evaluation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently lock the evaluation. No further score changes will be
                  possible without an admin reopen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleFinalise}>Finalise</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Score table grouped by category */}
      {categories.map(category => {
        const catReqs = requirements.filter(r => (r.category ?? 'General') === category)
        return (
          <section key={category}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {category}
            </h2>
            <div className="rounded-xl border border-stone-200/80 bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-stone-200/80 bg-stone-50/60 hover:bg-stone-50/60">
                    <TableHead className="w-[40%] text-xs font-medium text-stone-500">Requirement</TableHead>
                    <TableHead className="text-xs font-medium text-stone-500">Evaluator Scores</TableHead>
                    <TableHead className="w-[110px] text-right text-xs font-medium text-stone-500">Conflict</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catReqs.map(req => {
                    const reqScores = scoresByReq.get(req.id) ?? []
                    const thread = threadByReq.get(req.id)
                    const hasConflict = thread !== undefined
                    const conflictOpen = thread && !thread.isClosed

                    return (
                      <TableRow
                        key={req.id}
                        className={conflictOpen ? 'bg-amber-50/50 border-b border-stone-200/60' : 'border-b border-stone-200/60 hover:bg-emerald-900/[0.025]'}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[13px] font-medium text-emerald-950">{req.title}</span>
                            {req.isComplianceGate && <ComplianceGateBadge />}
                          </div>
                        </TableCell>

                        {/* All evaluators scoring this requirement are on the same team.
                            Scores shown side-by-side so the team can spot intra-team bias. */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {reqScores.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              reqScores.map(s => (
                                <ScorePill
                                  key={s.id}
                                  value={s.value}
                                  userName={s.user.name}
                                  evidenceType={s.evidenceType}
                                />
                              ))
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          {hasConflict ? (
                            <button
                              onClick={() =>
                                setThreadDialog({
                                  threadId: thread.id,
                                  requirementId: req.id,
                                  requirementTitle: req.title,
                                  evaluatorType: req.evaluatorType,
                                  isClosed: thread.isClosed,
                                })
                              }
                              className={`inline-flex items-center gap-1 rounded-md px-2 h-[22px] text-[11px] font-medium ring-1 ring-inset transition-opacity hover:opacity-75 ${
                                thread.isClosed
                                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-200/60'
                                  : 'bg-amber-50 text-amber-800 ring-amber-300/60'
                              }`}
                            >
                              {thread.isClosed ? 'Resolved' : 'Conflict'}
                            </button>
                          ) : (
                            <span className="text-xs text-stone-300">—</span>
                          )}
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

      {threadDialog && (
        <ConflictThread
          evaluationId={evaluationId}
          threadId={threadDialog.threadId}
          requirementTitle={threadDialog.requirementTitle}
          isClosed={threadDialog.isClosed}
          currentUserId={currentUserId}
          // Admin can close any conflict; evaluators can only close their own team's conflicts
          canClose={isAdmin || currentEvaluatorType === threadDialog.evaluatorType}
          open={true}
          onOpenChange={open => { if (!open) setThreadDialog(null) }}
          onClosed={handleThreadClosed}
        />
      )}
    </div>
  )
}
