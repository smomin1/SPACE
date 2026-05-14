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
  if (!canDo(session.user.role, 'lock:evaluation')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id: evaluationId } = await params
  // Admin force-merge bypasses the all-submitted guard
  const result = await transitionEvaluation(evaluationId, 'MERGED', session.user.id, true)

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
