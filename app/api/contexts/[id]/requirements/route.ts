import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { WeightLevel } from '@prisma/client'

export async function GET(
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
    const [allRequirements, assigned] = await Promise.all([
      prisma.requirement.findMany({
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
        select: { id: true, title: true, description: true, evaluatorType: true, weight: true, isComplianceGate: true, category: true, order: true },
      }),
      prisma.requirementContext.findMany({
        where: { contextId: id },
        select: { requirementId: true, weightOverride: true },
      }),
    ])

    const assignedMap = new Map(assigned.map((r) => [r.requirementId, r.weightOverride]))
    const requirements = allRequirements.map((r) => ({
      ...r,
      assigned: assignedMap.has(r.id),
      weightOverride: assignedMap.get(r.id) ?? null,
    }))

    return Response.json({ requirements })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

const assignSchema = z.object({
  requirementId: z.string().min(1),
  assigned: z.boolean(),
  weightOverride: z.nativeEnum(WeightLevel).nullable().optional(),
})

export async function POST(
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

  const { id: contextId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { requirementId, assigned, weightOverride = null } = parsed.data

  try {
    if (assigned) {
      await prisma.requirementContext.upsert({
        where: { requirementId_contextId: { requirementId, contextId } },
        create: { requirementId, contextId, weightOverride },
        update: { weightOverride },
      })
    } else {
      await prisma.requirementContext.deleteMany({ where: { requirementId, contextId } })
    }
    return Response.json({ requirementId, contextId, assigned, weightOverride })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
