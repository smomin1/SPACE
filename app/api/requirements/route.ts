import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { requirementBaseSchema } from '@/lib/requirement-schema'
import type { EvaluatorType } from '@prisma/client'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  // Any authenticated user can read requirements (evaluators need the list to score against).
  // No role gate here — just authentication.

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const evaluatorType = searchParams.get('evaluatorType') as EvaluatorType | null
  const isComplianceGateParam = searchParams.get('isComplianceGate')

  const where: Record<string, unknown> = {}
  if (category) where.category = category
  if (evaluatorType) where.evaluatorType = evaluatorType
  if (isComplianceGateParam !== null) {
    where.isComplianceGate = isComplianceGateParam === 'true'
  }

  try {
    const requirements = await prisma.requirement.findMany({
      where,
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    })
    return Response.json({ requirements })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
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

  const parsed = requirementBaseSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const requirement = await prisma.requirement.create({ data: parsed.data })
    return Response.json({ requirement }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
