import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { platformBaseSchema } from '@/lib/platform-schema'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const platforms = await prisma.platform.findMany({
      orderBy: { name: 'asc' },
      include: {
        contexts: { include: { context: { select: { id: true, name: true } } } },
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
    return Response.json({ platforms })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:platform')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = platformBaseSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const platform = await prisma.platform.create({ data: parsed.data })
    return Response.json({ platform }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
