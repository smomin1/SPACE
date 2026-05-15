import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { transitionEvaluation } from '@/lib/evaluation-state'

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
  const userId = session.user.id

  const [evaluation, myAssignment] = await Promise.all([
    prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: {
        id: true,
        state: true,
        assignments: { select: { userId: true, evaluatorType: true, hasSubmitted: true, isLead: true } },
      },
    }),
    prisma.evaluatorAssignment.findUnique({
      where: { evaluationId_userId: { evaluationId, userId } },
      select: { evaluatorType: true, isLead: true, hasSubmitted: true },
    }),
  ])

  if (!evaluation) {
    return Response.json({ error: 'Evaluation not found', code: 'NOT_FOUND' }, { status: 404 })
  }
  if (evaluation.state !== 'IN_PROGRESS') {
    return Response.json({ error: 'Evaluation is not in progress', code: 'WRONG_STATE' }, { status: 422 })
  }
  if (!myAssignment) {
    return Response.json({ error: 'Not assigned to this evaluation', code: 'NOT_ASSIGNED' }, { status: 403 })
  }

  const isAdmin = canDo(session.user.role, 'lock:evaluation')
  if (!myAssignment.isLead && !isAdmin) {
    return Response.json({ error: 'Only team leads can merge team scores', code: 'NOT_LEAD' }, { status: 403 })
  }

  // All members of this evaluatorType must have submitted
  const myType = myAssignment.evaluatorType
  const myTeam = evaluation.assignments.filter(a => a.evaluatorType === myType)
  const unsubmittedInTeam = myTeam.filter(a => !a.hasSubmitted)

  if (unsubmittedInTeam.length > 0 && !isAdmin) {
    return Response.json(
      {
        error: `${unsubmittedInTeam.length} team member(s) have not yet submitted`,
        code: 'TEAM_NOT_SUBMITTED',
      },
      { status: 422 },
    )
  }

  // Record this team's merge (upsert in case of re-merge)
  await prisma.evaluationTeamMerge.upsert({
    where: { evaluationId_evaluatorType: { evaluationId, evaluatorType: myType } },
    create: { evaluationId, evaluatorType: myType, mergedById: userId },
    update: { mergedAt: new Date(), mergedById: userId },
  })

  // Check if all teams present in this evaluation have now merged
  const presentTypes = [...new Set(evaluation.assignments.map(a => a.evaluatorType))]
  const mergedRecords = await prisma.evaluationTeamMerge.findMany({
    where: { evaluationId },
    select: { evaluatorType: true },
  })
  const mergedTypes = new Set(mergedRecords.map(r => r.evaluatorType))
  const allTeamsMerged = presentTypes.every(t => mergedTypes.has(t))

  let evaluationState: string = evaluation.state
  if (allTeamsMerged) {
    const result = await transitionEvaluation(evaluationId, 'MERGED', userId, true)
    if (result.ok) {
      evaluationState = 'MERGED'
    }
  }

  return Response.json({ teamMerged: true, evaluationState })
}
