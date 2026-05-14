import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

const patchSchema = z.object({
  action: z.literal('close'),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'access:evaluate')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id: evaluationId, threadId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const thread = await prisma.conflictThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      evaluationId: true,
      isClosed: true,
      evaluation: { select: { lockedAt: true } },
    },
  })

  if (!thread || thread.evaluationId !== evaluationId) {
    return Response.json({ error: 'Thread not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (thread.evaluation.lockedAt !== null) {
    return Response.json(
      { error: 'Evaluation is finalised and locked', code: 'EVALUATION_LOCKED' },
      { status: 403 },
    )
  }

  if (thread.isClosed) {
    return Response.json({ error: 'Thread is already closed', code: 'ALREADY_CLOSED' }, { status: 409 })
  }

  const updated = await prisma.conflictThread.update({
    where: { id: threadId },
    data: { isClosed: true, closedAt: new Date(), closedById: session.user.id },
    select: { id: true, isClosed: true, closedAt: true },
  })

  return Response.json({ thread: updated })
}
