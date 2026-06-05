import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { ScoringForm } from './components/ScoringForm'
import { MergedView } from './components/MergedView'
import { FinalisedView } from './components/FinalisedView'

const REQUIREMENT_SELECT = {
  id: true,
  title: true,
  description: true,
  evaluatorType: true,
  weight: true,
  isComplianceGate: true,
  category: true,
  order: true,
} as const

export default async function EvaluationWorkspacePage({
  params,
}: {
  params: Promise<{ evaluationId: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { evaluationId } = await params
  const userId = session.user.id
  const role = session.user.role

  if (!canDo(role, 'access:evaluate') && !canDo(role, 'view:all_scores')) {
    redirect('/dashboard')
  }

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: {
      id: true,
      state: true,
      lockedAt: true,
      platform: { select: { id: true, name: true, vendor: true, status: true, track: true } },
      assignments: {
        select: {
          userId: true,
          evaluatorType: true,
          hasSubmitted: true,
          isLead: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!evaluation) notFound()

  // VITAL evaluations have their own workspace — never render the Tool Evaluator views for them
  if (evaluation.platform.track === 'VITAL') redirect(`/vital-evaluate/${evaluationId}`)

  const isEvaluator = canDo(role, 'access:evaluate')
  const isAdmin = canDo(role, 'lock:evaluation')
  const seeAll = canDo(role, 'view:all_scores')

  // Evaluators (non-admin/viewer) must be assigned
  const myAssignment = evaluation.assignments.find(a => a.userId === userId)
  if (isEvaluator && !seeAll && !myAssignment) redirect('/dashboard')

  // ── IN_PROGRESS ──────────────────────────────────────────────────────────────
  if (evaluation.state === 'IN_PROGRESS') {
    // Admin without assignment: show read-only monitoring view
    if (isAdmin && !myAssignment) {
      return (
        <main className="container mx-auto py-8 max-w-5xl">
          <header className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold">{evaluation.platform.name}</h1>
              <span className="inline-flex items-center rounded-md bg-stone-100/80 ring-1 ring-inset ring-stone-200 px-2 h-[22px] text-[11.5px] font-medium tracking-tight text-emerald-950">
                <span className="size-1.5 rounded-full bg-emerald-600 mr-1.5" />
                In Progress
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{evaluation.platform.vendor}</p>
          </header>
          <div className="rounded-xl border border-stone-200/80 bg-white divide-y divide-stone-100">
            <div className="px-5 py-3.5">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">Evaluator Status</p>
              <div className="space-y-2">
                {evaluation.assignments.map(a => (
                  <div key={a.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-950">{a.user.name}</span>
                      <span className="text-xs text-stone-400 capitalize">{a.evaluatorType.toLowerCase()}</span>
                      {a.isLead && <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Lead</span>}
                    </div>
                    <span className={`text-xs font-medium ${a.hasSubmitted ? 'text-emerald-700' : 'text-stone-400'}`}>
                      {a.hasSubmitted ? 'Submitted' : 'Not submitted'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )
    }

    if (!isEvaluator || !myAssignment) redirect('/evaluations')

    const [requirements, ownScores, ownAgeRange] = await Promise.all([
      prisma.requirement.findMany({
        where: { evaluatorType: { in: [myAssignment.evaluatorType, 'BOTH'] } },
        select: REQUIREMENT_SELECT,
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
      }),
      prisma.score.findMany({
        where: { evaluationId, userId },
        select: { id: true, requirementId: true, value: true, evidenceType: true, comment: true },
      }),
      myAssignment.evaluatorType === 'PEDAGOGY'
        ? prisma.platformAgeRange.findUnique({
            where: { evaluationId_userId: { evaluationId, userId } },
            select: { ageMin: true, ageMax: true },
          })
        : Promise.resolve(null),
    ])

    const allMembers = evaluation.assignments.map(a => ({
      userId: a.userId,
      name: a.user.name,
      evaluatorType: a.evaluatorType,
      isLead: a.isLead,
      hasSubmitted: a.hasSubmitted,
    }))

    return (
      <main className="container mx-auto py-8 max-w-5xl">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">{evaluation.platform.name}</h1>
            <span className="inline-flex items-center rounded-md bg-stone-100/80 ring-1 ring-inset ring-stone-200 px-2 h-[22px] text-[11.5px] font-medium tracking-tight text-emerald-950">
              <span className="size-1.5 rounded-full bg-emerald-600 mr-1.5" />
              In Progress
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{evaluation.platform.vendor}</p>
        </header>

        <ScoringForm
          evaluationId={evaluationId}
          requirements={requirements}
          ownScores={ownScores}
          assignment={{ userId: myAssignment.userId, evaluatorType: myAssignment.evaluatorType, hasSubmitted: myAssignment.hasSubmitted, isLead: myAssignment.isLead }}
          isAdmin={isAdmin}
          allMembers={allMembers}
          initialAgeMin={ownAgeRange?.ageMin ?? null}
          initialAgeMax={ownAgeRange?.ageMax ?? null}
        />
      </main>
    )
  }

  // ── MERGED ───────────────────────────────────────────────────────────────────
  // VIEWERs may only observe FINALISED evaluations.
  if (evaluation.state === 'MERGED') {
    if (!isEvaluator) redirect('/dashboard')

    const [requirements, allScores, threads, submissionEvents, auditEvents, allAgeRanges, ageRangeConflict] = await Promise.all([
      prisma.requirement.findMany({
        select: REQUIREMENT_SELECT,
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
      }),
      prisma.score.findMany({
        where: { evaluationId },
        select: {
          id: true,
          requirementId: true,
          value: true,
          evidenceType: true,
          comment: true,
          userId: true,
          updatedAt: true,
          user: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.conflictThread.findMany({
        where: { evaluationId },
        select: { id: true, requirementId: true, isClosed: true },
      }),
      prisma.evaluatorAssignment.findMany({
        where: { evaluationId, hasSubmitted: true },
        select: {
          submittedAt: true,
          evaluatorType: true,
          isLead: true,
          user: { select: { name: true } },
        },
        orderBy: { submittedAt: 'asc' },
      }),
      prisma.scoreAuditLog.findMany({
        where: {
          score: { evaluationId },
          NOT: { previousValue: null, newValue: null },
        },
        select: {
          id: true,
          changedAt: true,
          previousValue: true,
          newValue: true,
          changedBy: { select: { name: true } },
          score: { select: { requirement: { select: { title: true } } } },
        },
        orderBy: { changedAt: 'asc' },
        take: 50,
      }),
      prisma.platformAgeRange.findMany({
        where: { evaluationId },
        select: {
          userId: true,
          evaluatorType: true,
          ageMin: true,
          ageMax: true,
          updatedAt: true,
          user: { select: { name: true } },
        },
      }),
      prisma.ageRangeConflict.findUnique({
        where: { evaluationId },
        select: { id: true, isClosed: true },
      }),
    ])

    type ActivityEntry = {
      id: string
      timestamp: string
      label: string
      type: 'submit' | 'score_update'
    }

    const activityLog: ActivityEntry[] = [
      ...submissionEvents.map((e, i) => ({
        id: `sub-${i}`,
        timestamp: e.submittedAt?.toISOString() ?? new Date(0).toISOString(),
        label: `${e.user.name ?? 'Unknown'}${e.isLead ? ' (Lead)' : ''} submitted ${e.evaluatorType === 'PEDAGOGY' ? 'Pedagogy' : 'Technical'} scores`,
        type: 'submit' as const,
      })),
      ...auditEvents
        .filter(e => e.previousValue !== e.newValue)
        .map(e => ({
          id: `audit-${e.id}`,
          timestamp: e.changedAt.toISOString(),
          label: `${e.changedBy.name ?? 'Unknown'} updated ${e.score.requirement.title}: ${e.previousValue ?? 'N/A'} → ${e.newValue ?? 'N/A'}`,
          type: 'score_update' as const,
        })),
    ].sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    // Each team resolves their own conflicts independently
    const myEvaluatorType = myAssignment?.evaluatorType ?? null
    const openThreadCount = threads.filter(t => !t.isClosed).length

    return (
      <main className="container mx-auto py-8 max-w-6xl">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">{evaluation.platform.name}</h1>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-700/20">
              Merged - Review
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{evaluation.platform.vendor}</p>
        </header>

        <MergedView
          evaluationId={evaluationId}
          requirements={requirements}
          allScores={allScores}
          threads={threads}
          openThreadCount={openThreadCount}
          currentUserId={userId}
          currentUserRole={role}
          currentEvaluatorType={myEvaluatorType}
          isLead={myAssignment?.isLead ?? false}
          isAdmin={isAdmin}
          activityLog={activityLog}
          ageRanges={allAgeRanges}
          ageRangeConflict={ageRangeConflict}
        />
      </main>
    )
  }

  // ── FINALISED ─────────────────────────────────────────────────────────────────
  const [requirements, allScores] = await Promise.all([
    prisma.requirement.findMany({
      select: REQUIREMENT_SELECT,
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    }),
    prisma.score.findMany({
      where: { evaluationId },
      select: {
        requirementId: true,
        value: true,
        userId: true,
        user: { select: { id: true, name: true } },
      },
    }),
  ])

  const evaluatorTypeByUser = new Map(evaluation.assignments.map(a => [a.userId, a.evaluatorType]))

  return (
    <main className="container mx-auto py-8 max-w-5xl">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold">{evaluation.platform.name}</h1>
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 ring-1 ring-inset ring-green-700/20">
            Finalised
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{evaluation.platform.vendor}</p>
      </header>

      <FinalisedView
        evaluationId={evaluationId}
        requirements={requirements}
        allScores={allScores}
        evaluatorTypeByUser={Object.fromEntries(evaluatorTypeByUser)}
        platform={evaluation.platform}
        lockedAt={evaluation.lockedAt!.toISOString()}
        isAdmin={isAdmin}
      />
    </main>
  )
}
