import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
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
  // Admin force-merge bypasses the all-submitted guard; evaluators must wait for all to submit
  const result = await transitionEvaluation(evaluationId, 'MERGED', session.user.id, isAdmin)

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
