import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { requirementBaseSchema } from '@/lib/requirement-schema'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:requirements')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = requirementBaseSchema.partial().safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const requirement = await prisma.requirement.update({
      where: { id },
      data: parsed.data,
    })
    return Response.json({ requirement })
  } catch (err: unknown) {
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
    }
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:requirements')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  try {
    const requirement = await prisma.requirement.findUnique({ where: { id } })
    if (!requirement) {
      return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Cascade: audit logs -> scores -> conflict messages -> conflict threads -> context join -> requirement
    const scoreIds = await prisma.score.findMany({
      where: { requirementId: id },
      select: { id: true },
    })
    await prisma.$transaction([
      prisma.scoreAuditLog.deleteMany({ where: { scoreId: { in: scoreIds.map(s => s.id) } } }),
      prisma.score.deleteMany({ where: { requirementId: id } }),
      prisma.conflictMessage.deleteMany({ where: { thread: { requirementId: id } } }),
      prisma.conflictThread.deleteMany({ where: { requirementId: id } }),
      prisma.requirementContext.deleteMany({ where: { requirementId: id } }),
      prisma.requirement.delete({ where: { id } }),
    ])
    return new Response(null, { status: 204 })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
