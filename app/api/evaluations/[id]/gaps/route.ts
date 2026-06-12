import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { EvidenceType } from '@prisma/client'

// ─── GET /api/evaluations/[id]/gaps ──────────────────────────────────────────
// Returns requirements that have zero scores in this evaluation (gap requirements).
// Admin-only — used to identify new requirements added after an evaluation was created.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:platform')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: evaluationId } = await params

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: {
      id: true,
      state: true,
      platform: { select: { id: true, name: true, vendor: true, track: true } },
    },
  })
  if (!evaluation) return Response.json({ error: 'Not found' }, { status: 404 })

  // Only applicable to TOOL-track evaluations
  if (evaluation.platform.track === 'VITAL') {
    return Response.json({ gaps: [], evaluation })
  }

  // All TOOL requirements
  const allRequirements = await prisma.requirement.findMany({
    where: { evaluatorType: { in: ['PEDAGOGY', 'TECHNICAL', 'BOTH'] } },
    select: {
      id: true,
      title: true,
      description: true,
      evaluatorType: true,
      weight: true,
      isComplianceGate: true,
      category: true,
      order: true,
    },
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  })

  // Requirements that already have at least one score in this evaluation
  const scored = await prisma.score.groupBy({
    by: ['requirementId'],
    where: { evaluationId },
  })
  const scoredIds = new Set(scored.map((s) => s.requirementId))

  const gaps = allRequirements.filter((r) => !scoredIds.has(r.id))

  return Response.json({ gaps, evaluation })
}

// ─── POST /api/evaluations/[id]/gaps ─────────────────────────────────────────
// Admin submits scores for gap requirements directly.
// Bypasses the FINALISED lock since these are new requirements, not re-scores.

const scoreSchema = z.object({
  requirementId: z.string().min(1),
  value: z.number().int().min(0).max(4).nullable(),
  evidenceType: z.enum(['TRIAL', 'DEMO', 'DOCUMENTATION', 'VENDOR_CLAIM']).nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
})

const bodySchema = z.object({
  scores: z.array(scoreSchema).min(1),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:platform')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: evaluationId } = await params

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: { id: true, state: true },
  })
  if (!evaluation) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', issues: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { scores } = parsed.data
  const requirementIds = scores.map((s) => s.requirementId)

  // Verify all requirements exist and have no existing scores in this evaluation
  const [requirements, alreadyScored] = await Promise.all([
    prisma.requirement.findMany({
      where: { id: { in: requirementIds } },
      select: { id: true, isComplianceGate: true },
    }),
    prisma.score.groupBy({
      by: ['requirementId'],
      where: { evaluationId, requirementId: { in: requirementIds } },
    }),
  ])

  const existingReqIds = new Set(requirements.map((r) => r.id))
  const alreadyScoredIds = new Set(alreadyScored.map((s) => s.requirementId))

  const invalid = requirementIds.filter((id) => !existingReqIds.has(id))
  if (invalid.length > 0) {
    return Response.json({ error: 'Unknown requirement IDs', ids: invalid }, { status: 422 })
  }
  const notGap = requirementIds.filter((id) => alreadyScoredIds.has(id))
  if (notGap.length > 0) {
    return Response.json(
      { error: 'Some requirements already have scores and cannot be gap-filled', ids: notGap },
      { status: 409 },
    )
  }

  const reqById = new Map(requirements.map((r) => [r.id, r]))

  // Create Score + ScoreAuditLog for each gap score in a single transaction
  await prisma.$transaction(async (tx) => {
    for (const s of scores) {
      const created = await tx.score.create({
        data: {
          evaluationId,
          requirementId: s.requirementId,
          userId: session.user.id,
          value: s.value ?? null,
          evidenceType: (s.evidenceType ?? null) as EvidenceType | null,
          comment: s.comment ?? null,
        },
      })
      await tx.scoreAuditLog.create({
        data: {
          scoreId: created.id,
          changedById: session.user.id,
          previousValue: null,
          newValue: s.value ?? null,
          previousEvidenceType: null,
          newEvidenceType: (s.evidenceType ?? null) as EvidenceType | null,
          previousComment: null,
          newComment: s.comment ?? null,
          reason: 'ADMIN_GAP_FILL',
        },
      })

      // Compliance gate: FAIL on a compliance gate requirement disqualifies the platform
      const req = reqById.get(s.requirementId)
      if (s.value === 0 && req?.isComplianceGate) {
        const ev = await tx.evaluation.findUnique({ where: { id: evaluationId }, select: { platformId: true } })
        if (ev) {
          await tx.platform.update({ where: { id: ev.platformId }, data: { status: 'DISQUALIFIED' } })
        }
      }
    }
  })

  return Response.json({ saved: scores.length })
}
