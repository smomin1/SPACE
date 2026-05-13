import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { contextBaseSchema } from '@/lib/context-schema'

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
    const context = await prisma.context.findUnique({
      where: { id },
      include: {
        _count: { select: { requirements: true } },
      },
    })
    if (!context) {
      return Response.json({ error: 'Not Found', code: 'NOT_FOUND' }, { status: 404 })
    }
    return Response.json({ context })
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
  if (!canDo(session.user.role, 'manage:contexts')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = contextBaseSchema.partial().safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const context = await prisma.context.update({ where: { id }, data: parsed.data })
    return Response.json({ context })
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e?.code === 'P2025') {
      return Response.json({ error: 'Not Found', code: 'NOT_FOUND' }, { status: 404 })
    }
    if (e?.code === 'P2002') {
      return Response.json({ error: 'A context with that name already exists', code: 'DUPLICATE_NAME' }, { status: 409 })
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
  if (!canDo(session.user.role, 'manage:contexts')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  try {
    await prisma.$transaction([
      prisma.requirementContext.deleteMany({ where: { contextId: id } }),
      prisma.context.delete({ where: { id } }),
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
