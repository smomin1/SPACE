import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { checkAllTeamsSubmitted, transitionEvaluation, autoFinaliseIfReady } from '@/lib/evaluation-state'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'access:evaluate')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id: evaluationId } = await params

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: { id: true, state: true, lockedAt: true },
  })

  if (!evaluation) {
    return Response.json({ error: 'Evaluation not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (evaluation.state !== 'IN_PROGRESS') {
    return Response.json(
      { error: 'Evaluation is not in progress', code: 'WRONG_STATE' },
      { status: 422 },
    )
  }

  if (evaluation.lockedAt !== null) {
    return Response.json(
      { error: 'Evaluation is finalised and locked', code: 'EVALUATION_LOCKED' },
      { status: 403 },
    )
  }

  const assignment = await prisma.evaluatorAssignment.findUnique({
    where: { evaluationId_userId: { evaluationId, userId: session.user.id } },
    select: { id: true, evaluatorType: true, hasSubmitted: true },
  })

  if (!assignment) {
    return Response.json(
      { error: 'You are not assigned to this evaluation', code: 'NOT_ASSIGNED' },
      { status: 403 },
    )
  }

  if (assignment.hasSubmitted) {
    return Response.json(
      { error: 'You have already submitted', code: 'ALREADY_SUBMITTED' },
      { status: 409 },
    )
  }

  // Every requirement in this evaluator's set (their type + shared BOTH) must be
  // answered. "Answered" = a Score row exists, INCLUDING N/A (value null), which is
  // a deliberate answer in the UI. This mirrors the workspace progress counter and
  // the GET set (evaluatorType in [type, BOTH]) exactly, so the gate can't disagree.
  const [requirements, scores] = await Promise.all([
    prisma.requirement.findMany({
      where: { evaluatorType: { in: [assignment.evaluatorType, 'BOTH'] } },
      select: { id: true },
    }),
    prisma.score.findMany({
      where: { evaluationId, userId: session.user.id },
      select: { requirementId: true },
    }),
  ])

  const scoredIds = new Set(scores.map(s => s.requirementId))
  const unscoredCount = requirements.filter(r => !scoredIds.has(r.id)).length

  if (unscoredCount > 0) {
    return Response.json(
      {
        error: `${unscoredCount} requirement(s) have not been scored`,
        code: 'INCOMPLETE_SCORES',
        unscoredCount,
      },
      { status: 422 },
    )
  }

  await prisma.evaluatorAssignment.update({
    where: { id: assignment.id },
    data: { hasSubmitted: true, submittedAt: new Date() },
  })

  // Auto-transition if all teams now submitted
  let evaluationState: string = evaluation.state
  const allSubmitted = await checkAllTeamsSubmitted(evaluationId)
  if (allSubmitted) {
    const transition = await transitionEvaluation(evaluationId, 'MERGED', session.user.id)
    if (transition.ok) {
      evaluationState = 'MERGED'
      // If there are no conflicts at all, immediately finalise
      if ((transition.conflictCount ?? 0) === 0) {
        const finalised = await autoFinaliseIfReady(evaluationId, session.user.id)
        if (finalised) evaluationState = 'FINALISED'
      }
    }
  }

  return Response.json({ submitted: true, evaluationState })
}
