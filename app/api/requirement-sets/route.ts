import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { requirementSetBaseSchema } from '@/lib/requirement-set-schema'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const sets = await prisma.requirementSet.findMany({ orderBy: { order: 'asc' } })
    return Response.json({ requirementSets: sets })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:requirement_sets')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = requirementSetBaseSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const set = await prisma.requirementSet.create({ data: parsed.data })
    return Response.json({ requirementSet: set }, { status: 201 })
  } catch (err: unknown) {
    if (err !== null && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
      return Response.json(
        { error: 'A requirement set with this key already exists', code: 'DUPLICATE_KEY' },
        { status: 409 },
      )
    }
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
