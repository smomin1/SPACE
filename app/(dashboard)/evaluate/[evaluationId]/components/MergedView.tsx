'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronRight } from 'lucide-react'
import { ConflictThread } from './ConflictThread'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ComplianceGateBadge, WeightTier } from '@/components/admin/_shared/badges'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  updatedAt: Date | string
  user: { id: string; name: string | null; role: Role }
}

type Thread = { id: string; requirementId: string; isClosed: boolean }

type ActivityEntry = {
  id: string
  timestamp: string
  label: string
  type: 'submit' | 'score_update'
}

type SheetState = {
  threadId: string
  requirementId: string
  requirementTitle: string
  evaluatorType: string
  isClosed: boolean
  evaluatorScores: Array<{
    userId: string
    userName: string | null
    value: number | null
    evidenceType: string | null
    updatedAt: string
  }>
  myScore: { value: number | null; evidenceType: string | null; comment: string | null } | null
}

type Props = {
  evaluationId: string
  requirements: Requirement[]
  allScores: ScoreRow[]
  threads: Thread[]
  openThreadCount: number
  currentUserId: string
  currentUserRole: Role
  currentEvaluatorType: string | null
  isLead: boolean
  isAdmin: boolean
  activityLog: ActivityEntry[]
}

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
      {userName ?? '?'}: {value}
      {evidenceType ? ` · ${evidenceType.charAt(0) + evidenceType.slice(1).toLowerCase().replace('_', ' ')}` : ''}
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
  currentEvaluatorType,
  isLead,
  isAdmin,
  activityLog,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [openThreadCount, setOpenThreadCount] = useState(initialOpenCount)
  const [localThreads, setLocalThreads] = useState(threads)
  const [sheetState, setSheetState] = useState<SheetState | null>(null)

  const scoresByReq = new Map<string, ScoreRow[]>()
  for (const s of allScores) {
    const arr = scoresByReq.get(s.requirementId) ?? []
    arr.push(s)
    scoresByReq.set(s.requirementId, arr)
  }

  const openLocalThreads = localThreads.filter(t => !t.isClosed)
  const allConflictsResolved = localThreads.length > 0 && openLocalThreads.length === 0

  const categories = [...new Set(requirements.map(r => r.category ?? 'General'))].sort()

  function openThread(req: Requirement, thread: Thread) {
    const reqScores = scoresByReq.get(req.id) ?? []
    const myScoreRow = reqScores.find(s => s.userId === currentUserId)
    setSheetState({
      threadId: thread.id,
      requirementId: req.id,
      requirementTitle: req.title,
      evaluatorType: req.evaluatorType,
      isClosed: thread.isClosed,
      evaluatorScores: reqScores.map(s => ({
        userId: s.userId,
        userName: s.user.name,
        value: s.value,
        evidenceType: s.evidenceType,
        updatedAt: new Date(s.updatedAt).toISOString(),
      })),
      myScore: myScoreRow
        ? { value: myScoreRow.value, evidenceType: myScoreRow.evidenceType, comment: myScoreRow.comment }
        : null,
    })
  }

  function handleThreadClosed(requirementId: string) {
    setLocalThreads(prev => prev.map(t => t.requirementId === requirementId ? { ...t, isClosed: true } : t))
    setOpenThreadCount(c => Math.max(0, c - 1))
    setSheetState(prev => prev ? { ...prev, isClosed: true } : null)
  }

  function handleScoreUpdated(newValue: number | null, threadAutoClosed: boolean) {
    setSheetState(prev =>
      prev
        ? {
            ...prev,
            myScore: {
              value: newValue,
              evidenceType: prev.myScore?.evidenceType ?? null,
              comment: prev.myScore?.comment ?? null,
            },
          }
        : null,
    )
    if (threadAutoClosed && sheetState) {
      handleThreadClosed(sheetState.requirementId)
    }
    router.refresh()
  }

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

  // Determine which requirements to show in the conflict list
  const conflictRequirements = openLocalThreads.length > 0
    ? openLocalThreads.map(t => requirements.find(r => r.id === t.requirementId)).filter((r): r is Requirement => Boolean(r))
    : null

  // All requirements grouped by evaluatorType (for resolved/no-conflict state)
  const pedRequirements = requirements.filter(r => r.evaluatorType === 'PEDAGOGY')
  const techRequirements = requirements.filter(r => r.evaluatorType === 'TECHNICAL')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: conflict list or all-requirements list */}
      <div className="lg:col-span-2 space-y-6">
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

        {/* Conflict list: only conflicting requirements when open threads exist */}
        {conflictRequirements !== null ? (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Open Conflicts ({openLocalThreads.length})
            </h2>
            <div className="space-y-2">
              {conflictRequirements.map(req => {
                const reqScores = scoresByReq.get(req.id) ?? []
                const thread = localThreads.find(t => t.requirementId === req.id)
                if (!thread) return null
                return (
                  <div
                    key={req.id}
                    className="rounded-xl border border-stone-200/80 bg-white overflow-hidden"
                  >
                    <div className="px-4 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-[13px] font-medium text-emerald-950">{req.title}</span>
                        {req.isComplianceGate && <ComplianceGateBadge />}
                        <WeightTier value={req.weight as 'HIGH' | 'MEDIUM' | 'LOW'} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {reqScores.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No scores yet</span>
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
                    </div>
                    <button
                      onClick={() => openThread(req, thread)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 border-t text-[12.5px] font-medium tracking-tight transition-colors bg-amber-50/80 text-amber-700 hover:bg-amber-100/80 border-amber-100"
                    >
                      <ChevronRight className="size-3.5 shrink-0" />
                      Resolve Conflict
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] px-1.5 py-0 h-[18px] bg-transparent border-amber-200 text-amber-600"
                      >
                        Open
                      </Badge>
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ) : (
          /* All conflicts resolved or no conflicts: show all requirements */
          <>
            {(allConflictsResolved) && (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3">
                <p className="text-sm font-medium text-emerald-800">
                  All conflicts resolved — scores are ready to finalise.
                </p>
              </div>
            )}

            {pedRequirements.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Pedagogy Requirements
                </h2>
                <div className="space-y-2">
                  {pedRequirements.map(req => {
                    const reqScores = scoresByReq.get(req.id) ?? []
                    const thread = localThreads.find(t => t.requirementId === req.id)
                    return (
                      <div
                        key={req.id}
                        className="rounded-xl border border-stone-200/80 bg-white overflow-hidden"
                      >
                        <div className="px-4 py-3.5">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-[13px] font-medium text-emerald-950">{req.title}</span>
                            {req.isComplianceGate && <ComplianceGateBadge />}
                            <WeightTier value={req.weight as 'HIGH' | 'MEDIUM' | 'LOW'} />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {reqScores.length === 0 ? (
                              <span className="text-xs text-muted-foreground">No scores yet</span>
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
                        </div>
                        {thread && (
                          <button
                            onClick={() => openThread(req, thread)}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 border-t text-[12.5px] font-medium tracking-tight transition-colors ${
                              thread.isClosed
                                ? 'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 border-emerald-100'
                                : 'bg-amber-50/80 text-amber-700 hover:bg-amber-100/80 border-amber-100'
                            }`}
                          >
                            <ChevronRight className="size-3.5 shrink-0" />
                            {thread.isClosed ? 'View Resolved Thread' : 'Resolve Conflict'}
                            <Badge
                              variant="outline"
                              className={`ml-auto text-[10px] px-1.5 py-0 h-[18px] bg-transparent ${
                                thread.isClosed
                                  ? 'border-emerald-200 text-emerald-600'
                                  : 'border-amber-200 text-amber-600'
                              }`}
                            >
                              {thread.isClosed ? 'Resolved' : 'Open'}
                            </Badge>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {techRequirements.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Technical Requirements
                </h2>
                <div className="space-y-2">
                  {techRequirements.map(req => {
                    const reqScores = scoresByReq.get(req.id) ?? []
                    const thread = localThreads.find(t => t.requirementId === req.id)
                    return (
                      <div
                        key={req.id}
                        className="rounded-xl border border-stone-200/80 bg-white overflow-hidden"
                      >
                        <div className="px-4 py-3.5">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-[13px] font-medium text-emerald-950">{req.title}</span>
                            {req.isComplianceGate && <ComplianceGateBadge />}
                            <WeightTier value={req.weight as 'HIGH' | 'MEDIUM' | 'LOW'} />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {reqScores.length === 0 ? (
                              <span className="text-xs text-muted-foreground">No scores yet</span>
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
                        </div>
                        {thread && (
                          <button
                            onClick={() => openThread(req, thread)}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 border-t text-[12.5px] font-medium tracking-tight transition-colors ${
                              thread.isClosed
                                ? 'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 border-emerald-100'
                                : 'bg-amber-50/80 text-amber-700 hover:bg-amber-100/80 border-amber-100'
                            }`}
                          >
                            <ChevronRight className="size-3.5 shrink-0" />
                            {thread.isClosed ? 'View Resolved Thread' : 'Resolve Conflict'}
                            <Badge
                              variant="outline"
                              className={`ml-auto text-[10px] px-1.5 py-0 h-[18px] bg-transparent ${
                                thread.isClosed
                                  ? 'border-emerald-200 text-emerald-600'
                                  : 'border-amber-200 text-amber-600'
                              }`}
                            >
                              {thread.isClosed ? 'Resolved' : 'Open'}
                            </Badge>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {localThreads.length === 0 && categories.map(category => {
              const catReqs = requirements.filter(r => (r.category ?? 'General') === category)
              return (
                <section key={category}>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    {category}
                  </h2>
                  <div className="space-y-2">
                    {catReqs.map(req => {
                      const reqScores = scoresByReq.get(req.id) ?? []
                      return (
                        <div
                          key={req.id}
                          className="rounded-xl border border-stone-200/80 bg-white overflow-hidden"
                        >
                          <div className="px-4 py-3.5">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="text-[13px] font-medium text-emerald-950">{req.title}</span>
                              {req.isComplianceGate && <ComplianceGateBadge />}
                              <WeightTier value={req.weight as 'HIGH' | 'MEDIUM' | 'LOW'} />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {reqScores.length === 0 ? (
                                <span className="text-xs text-muted-foreground">No scores yet</span>
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
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </>
        )}
      </div>

      {/* Right column: activity log */}
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-stone-200/80 bg-white overflow-hidden sticky top-6">
          <div className="px-4 py-3 border-b bg-stone-50/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity log</p>
          </div>
          <div className="divide-y divide-stone-100 max-h-[600px] overflow-y-auto">
            {activityLog.length === 0 && (
              <p className="text-xs text-muted-foreground px-4 py-3">No activity yet.</p>
            )}
            {[...activityLog].reverse().map(entry => (
              <div key={entry.id} className="px-4 py-2.5">
                <p className="text-[12px] text-stone-700 leading-snug">{entry.label}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  {new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conflict thread Sheet — slides in from the right */}
      <Sheet open={!!sheetState} onOpenChange={open => { if (!open) setSheetState(null) }}>
        <SheetContent
          side="right"
          showCloseButton
          className="p-0 gap-0 flex flex-col sm:max-w-xl"
        >
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center gap-2 pr-8">
              <SheetTitle className="text-base leading-snug flex-1 text-left">
                {sheetState?.requirementTitle}
              </SheetTitle>
              <Badge
                variant={sheetState?.isClosed ? 'secondary' : 'destructive'}
                className="shrink-0"
              >
                {sheetState?.isClosed ? 'Resolved' : 'Conflict'}
              </Badge>
            </div>
          </SheetHeader>

          {sheetState && (
            <ConflictThread
              evaluationId={evaluationId}
              requirementId={sheetState.requirementId}
              threadId={sheetState.threadId}
              isClosed={sheetState.isClosed}
              currentUserId={currentUserId}
              canClose={isAdmin || (isLead && currentEvaluatorType === sheetState.evaluatorType)}
              canScore={!sheetState.isClosed && currentEvaluatorType === sheetState.evaluatorType}
              isLead={isLead}
              evaluatorScores={sheetState.evaluatorScores}
              myScore={sheetState.myScore}
              onClosed={() => handleThreadClosed(sheetState.requirementId)}
              onScoreUpdated={handleScoreUpdated}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
