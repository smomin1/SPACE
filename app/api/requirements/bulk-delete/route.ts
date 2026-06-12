import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
})

interface FailedDelete {
  id: string
  title: string
  reason: 'NOT_FOUND' | 'UNKNOWN'
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:requirements')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { ids } = parsed.data

  const existing = await prisma.requirement.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true },
  })

  const existingIds = new Set(existing.map((r) => r.id))
  const titleById = new Map(existing.map((r) => [r.id, r.title] as const))

  const failed: FailedDelete[] = []
  const deletable: string[] = []

  for (const id of ids) {
    if (!existingIds.has(id)) {
      failed.push({ id, title: titleById.get(id) ?? id, reason: 'NOT_FOUND' })
    } else {
      deletable.push(id)
    }
  }

  let deletedCount = 0
  if (deletable.length > 0) {
    try {
      const scoreIds = await prisma.score.findMany({
        where: { requirementId: { in: deletable } },
        select: { id: true },
      })
      const result = await prisma.$transaction([
        prisma.scoreAuditLog.deleteMany({ where: { scoreId: { in: scoreIds.map(s => s.id) } } }),
        prisma.score.deleteMany({ where: { requirementId: { in: deletable } } }),
        prisma.conflictMessage.deleteMany({ where: { thread: { requirementId: { in: deletable } } } }),
        prisma.conflictThread.deleteMany({ where: { requirementId: { in: deletable } } }),
        prisma.requirementContext.deleteMany({ where: { requirementId: { in: deletable } } }),
        prisma.requirement.deleteMany({ where: { id: { in: deletable } } }),
      ])
      deletedCount = result[5].count
    } catch (err) {
      console.error('Bulk delete failed', err)
      return Response.json(
        { error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
        { status: 500 },
      )
    }
  }

  return Response.json({
    deleted: deletedCount,
    failed,
  })
}
