import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

const postSchema = z.object({
  content: z.string().min(1).max(4000),
})

export async function GET(
  _request: Request,
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

  const thread = await prisma.conflictThread.findUnique({
    where: { id: threadId },
    select: { id: true, evaluationId: true, isClosed: true },
  })

  if (!thread || thread.evaluationId !== evaluationId) {
    return Response.json({ error: 'Thread not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const messages = await prisma.conflictMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, role: true } },
    },
  })

  return Response.json({ messages, isClosed: thread.isClosed })
}

export async function POST(
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

  const parsed = postSchema.safeParse(body)
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
    return Response.json(
      { error: 'Cannot post to a closed thread', code: 'THREAD_CLOSED' },
      { status: 409 },
    )
  }

  const message = await prisma.conflictMessage.create({
    data: { threadId, authorId: session.user.id, content: parsed.data.content },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, role: true } },
    },
  })

  return Response.json({ message }, { status: 201 })
}
