import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { EvaluatorType } from '@prisma/client'

const createEvaluationSchema = z.object({
  platformId: z.string().min(1),
  evaluators: z.array(z.object({
    userId: z.string().min(1),
    evaluatorType: z.nativeEnum(EvaluatorType),
    isLead: z.boolean().default(false),
  })).min(1),
})

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

  const parsed = createEvaluationSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { platformId, evaluators } = parsed.data

  try {
    // Idempotent: a platform has a single shadow Evaluation. If one already exists
    // (e.g. created by the evaluators route), reuse it and upsert the assignments so
    // we never end up with duplicate Evaluations for the same platform.
    const existing = await prisma.evaluation.findFirst({ where: { platformId }, select: { id: true } })
    let evaluationId: string
    if (existing) {
      evaluationId = existing.id
      for (const e of evaluators) {
        await prisma.evaluatorAssignment.upsert({
          where: { evaluationId_userId: { evaluationId, userId: e.userId } },
          create: { evaluationId, userId: e.userId, evaluatorType: e.evaluatorType, isLead: e.isLead },
          update: { evaluatorType: e.evaluatorType, isLead: e.isLead },
        })
      }
    } else {
      const created = await prisma.evaluation.create({
        data: {
          platformId,
          assignments: {
            create: evaluators.map(e => ({
              userId: e.userId,
              evaluatorType: e.evaluatorType,
              isLead: e.isLead,
            })),
          },
        },
        select: { id: true },
      })
      evaluationId = created.id
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: { id: true, platformId: true, state: true },
    })
    return Response.json({ evaluation }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
