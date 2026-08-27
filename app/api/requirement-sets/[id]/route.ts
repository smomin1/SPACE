import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { requirementSetBaseSchema } from '@/lib/requirement-set-schema'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:requirement_sets')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = requirementSetBaseSchema.partial().safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const set = await prisma.requirementSet.update({ where: { id }, data: parsed.data })
    return Response.json({ requirementSet: set })
  } catch (err: unknown) {
    if (err !== null && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: string }).code
      if (code === 'P2025') {
        return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
      }
      if (code === 'P2002') {
        return Response.json(
          { error: 'A requirement set with this key already exists', code: 'DUPLICATE_KEY' },
          { status: 409 },
        )
      }
    }
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// No hard delete: a RequirementSet with any ScreeningQuestion or SearchEvaluation
// rows attached must be deactivated (PUT { isActive: false }) instead, mirroring
// how other admin CRUD screens in this app avoid destructive deletes of
// referenced rows. A set with zero rows attached (never used) may be removed.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:requirement_sets')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  const [questionCount, evaluationCount] = await Promise.all([
    prisma.screeningQuestion.count({ where: { requirementSetId: id } }),
    prisma.searchEvaluation.count({ where: { requirementSetId: id } }),
  ])
  if (questionCount > 0 || evaluationCount > 0) {
    return Response.json(
      {
        error: 'This requirement set has questions or scans attached. Deactivate it instead of deleting.',
        code: 'HAS_DEPENDENTS',
      },
      { status: 409 },
    )
  }

  try {
    await prisma.requirementSet.delete({ where: { id } })
    return new Response(null, { status: 204 })
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
