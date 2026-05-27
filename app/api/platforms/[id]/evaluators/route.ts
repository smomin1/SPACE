import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { EvaluatorType, type Role } from '@prisma/client'

// Roles permitted to be assigned as each evaluator type
const ALLOWED_ROLES_FOR_TYPE: Record<EvaluatorType, Role[]> = {
  PEDAGOGY:   ['PEDAGOGY_EVALUATOR', 'ADMIN'],
  TECHNICAL:  ['TECHNICAL_EVALUATOR', 'ADMIN'],
  COMPLIANCE: ['ADMIN'],
  BOTH:       ['PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'ADMIN'],
}

export async function GET(
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

  const { id: platformId } = await params

  try {
    const evaluators = await prisma.platformEvaluatorAssignment.findMany({
      where: { platformId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return Response.json({ evaluators })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

const evaluatorActionSchema = z.object({
  userId: z.string().min(1),
  evaluatorType: z.nativeEnum(EvaluatorType),
  isLead: z.boolean().optional().default(false),
  action: z.enum(['assign', 'remove']),
})

export async function POST(
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

  const { id: platformId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = evaluatorActionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { userId, evaluatorType, isLead, action } = parsed.data

  try {
    if (action === 'assign') {
      // Validate the user's actual role is compatible with the requested evaluatorType
      const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      if (!targetUser) {
        return Response.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, { status: 404 })
      }
      if (!ALLOWED_ROLES_FOR_TYPE[evaluatorType].includes(targetUser.role)) {
        return Response.json(
          {
            error: `User role ${targetUser.role} cannot be assigned as ${evaluatorType} evaluator`,
            code: 'ROLE_MISMATCH',
          },
          { status: 422 }
        )
      }

      const assignment = await prisma.platformEvaluatorAssignment.upsert({
        where: { platformId_userId: { platformId, userId } },
        create: { platformId, userId, evaluatorType, isLead },
        update: { evaluatorType, isLead },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      })
      return Response.json({ assignment }, { status: 201 })
    } else {
      // Verify removing this evaluator won't drop below the minimum (1 per type)
      const remaining = await prisma.platformEvaluatorAssignment.count({
        where: { platformId, evaluatorType, userId: { not: userId } },
      })
      if (remaining < 1) {
        return Response.json(
          {
            error: `At least one ${evaluatorType} evaluator is required`,
            code: 'INSUFFICIENT_EVALUATORS',
          },
          { status: 422 }
        )
      }
      await prisma.platformEvaluatorAssignment.deleteMany({ where: { platformId, userId } })
      return Response.json({ removed: true })
    }
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
