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
      platform: { select: { id: true, name: true, vendor: true, status: true } },
      assignments: {
        select: {
          userId: true,
          evaluatorType: true,
          hasSubmitted: true,
        },
      },
    },
  })

  if (!evaluation) notFound()

  const isEvaluator = canDo(role, 'access:evaluate')
  const seeAll = canDo(role, 'view:all_scores')

  // Evaluators (non-admin/viewer) must be assigned
  const myAssignment = evaluation.assignments.find(a => a.userId === userId)
  if (isEvaluator && !seeAll && !myAssignment) {
    redirect('/dashboard')
  }

  // ── IN_PROGRESS ──────────────────────────────────────────────────────────────
  if (evaluation.state === 'IN_PROGRESS') {
    if (!isEvaluator) redirect('/dashboard')

    const assignment = myAssignment!
    const [requirements, ownScores] = await Promise.all([
      prisma.requirement.findMany({
        where: { evaluatorType: assignment.evaluatorType },
        select: REQUIREMENT_SELECT,
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
      }),
      prisma.score.findMany({
        where: { evaluationId, userId },
        select: { id: true, requirementId: true, value: true, evidenceType: true, comment: true },
      }),
    ])

    return (
      <main className="container mx-auto py-8 max-w-5xl">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">{evaluation.platform.name}</h1>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-inset ring-blue-700/20">
              In Progress
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{evaluation.platform.vendor}</p>
        </header>

        <ScoringForm
          evaluationId={evaluationId}
          requirements={requirements}
          ownScores={ownScores}
          assignment={assignment}
          isAdmin={canDo(role, 'lock:evaluation')}
          allAssignments={evaluation.assignments}
        />
      </main>
    )
  }

  // ── MERGED ───────────────────────────────────────────────────────────────────
  // VIEWERs may only observe FINALISED evaluations; block them from the active resolution phase.
  if (evaluation.state === 'MERGED') {
    if (!isEvaluator) redirect('/dashboard')
    const [requirements, allScores, threads] = await Promise.all([
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
          user: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.conflictThread.findMany({
        where: { evaluationId },
        select: { id: true, requirementId: true, isClosed: true },
      }),
    ])

    const openThreadCount = threads.filter(t => !t.isClosed).length

    return (
      <main className="container mx-auto py-8 max-w-6xl">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">{evaluation.platform.name}</h1>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-700/20">
              Merged — Review
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
          isAdmin={canDo(role, 'lock:evaluation')}
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
        isAdmin={canDo(role, 'lock:evaluation')}
      />
    </main>
  )
}
