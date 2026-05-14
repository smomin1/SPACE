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
  if (!canDo(session.user.role, 'finalise:evaluation')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id: evaluationId } = await params
  const result = await transitionEvaluation(evaluationId, 'FINALISED', session.user.id)

  if (!result.ok) {
    return Response.json({ error: result.message, code: result.error }, { status: 422 })
  }

  return Response.json({ state: 'FINALISED' })
}
