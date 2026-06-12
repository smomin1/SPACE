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
  const isAdmin = canDo(session.user.role, 'lock:evaluation')
  const isEvaluator = canDo(session.user.role, 'access:evaluate')
  if (!isAdmin && !isEvaluator) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id: evaluationId } = await params

  // Determine whether to force-merge:
  // - Admins always bypass the all-submitted guard.
  // - Team leads may force-merge once at least one PEDAGOGY and one TECHNICAL
  //   evaluator have submitted, even if others haven't yet.
  let force = isAdmin
  if (!force && isEvaluator) {
    const myAssignment = await prisma.evaluatorAssignment.findUnique({
      where: { evaluationId_userId: { evaluationId, userId: session.user.id } },
      select: { isLead: true },
    })
    if (myAssignment?.isLead) {
      const submitted = await prisma.evaluatorAssignment.findMany({
        where: { evaluationId, hasSubmitted: true },
        select: { evaluatorType: true },
      })
      const hasPedagogy = submitted.some(a => a.evaluatorType === 'PEDAGOGY' || a.evaluatorType === 'BOTH')
      const hasTechnical = submitted.some(a => a.evaluatorType === 'TECHNICAL' || a.evaluatorType === 'BOTH')
      force = hasPedagogy && hasTechnical
    }
  }

  const result = await transitionEvaluation(evaluationId, 'MERGED', session.user.id, force)

  if (!result.ok) {
    return Response.json({ error: result.message, code: result.error }, { status: 422 })
  }

  return Response.json({
    state: 'MERGED',
    compliancePassed: result.complianceResult?.passed ?? true,
    failedGates: result.complianceResult?.failedGates ?? [],
    conflictCount: result.conflictCount ?? 0,
  })
}
