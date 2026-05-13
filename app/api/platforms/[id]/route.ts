import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { platformBaseSchema } from '@/lib/platform-schema'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params

  try {
    const platform = await prisma.platform.findUnique({
      where: { id },
      include: {
        evaluatorAssignments: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
        evaluations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, state: true, createdAt: true },
        },
      },
    })
    if (!platform) {
      return Response.json({ error: 'Not Found', code: 'NOT_FOUND' }, { status: 404 })
    }
    return Response.json({ platform })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:platform')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = platformBaseSchema.partial().safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const platform = await prisma.platform.update({ where: { id }, data: parsed.data })
    return Response.json({ platform })
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e?.code === 'P2025') {
      return Response.json({ error: 'Not Found', code: 'NOT_FOUND' }, { status: 404 })
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
  if (!canDo(session.user.role, 'manage:platform')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  try {
    const evalCount = await prisma.evaluation.count({ where: { platformId: id } })
    if (evalCount > 0) {
      return Response.json(
        { error: 'Platform has existing evaluations and cannot be deleted', code: 'HAS_EVALUATIONS' },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      prisma.platformEvaluatorAssignment.deleteMany({ where: { platformId: id } }),
      prisma.platform.delete({ where: { id } }),
    ])
    return new Response(null, { status: 204 })
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e?.code === 'P2025') {
      return Response.json({ error: 'Not Found', code: 'NOT_FOUND' }, { status: 404 })
    }
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
