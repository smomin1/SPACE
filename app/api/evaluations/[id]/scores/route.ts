import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { updateScore } from '@/lib/score-service'
import { checkAllTeamsSubmitted, transitionEvaluation, autoFinaliseIfReady } from '@/lib/evaluation-state'

// ─── Validation ───────────────────────────────────────────────────────────────

const submitScoreSchema = z.object({
  requirementId: z.string().min(1),
  value: z.number().int().min(0).max(4).nullable(),
  evidenceType: z
    .enum(['TRIAL', 'DEMO', 'DOCUMENTATION', 'VENDOR_CLAIM'])
    .nullable()
    .optional(),
  comment: z.string().max(2000).nullable().optional(),
})

// ─── POST - submit / update a single score ────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'access:evaluate')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id: evaluationId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = submitScoreSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { requirementId, value, evidenceType = null, comment = null } = parsed.data

  // GUARD 1 - evaluation exists and is not locked (FINALISED)
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: { id: true, state: true, lockedAt: true, platformId: true },
  })

  if (!evaluation) {
    return Response.json({ error: 'Evaluation not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (evaluation.lockedAt !== null) {
    return Response.json(
      { error: 'Evaluation is finalised and locked', code: 'EVALUATION_LOCKED' },
      { status: 403 },
    )
  }

  // GUARD 2 - submitting user has an assignment for this evaluation
  const assignment = await prisma.evaluatorAssignment.findUnique({
    where: { evaluationId_userId: { evaluationId, userId: session.user.id } },
    select: { evaluatorType: true, hasSubmitted: true },
  })

  if (!assignment) {
    return Response.json(
      { error: 'You are not assigned to this evaluation', code: 'NOT_ASSIGNED' },
      { status: 403 },
    )
  }

  // GUARD 3 - requirement exists and its evaluatorType matches the user's assignment
  const requirement = await prisma.requirement.findUnique({
    where: { id: requirementId },
    select: { id: true, evaluatorType: true, isComplianceGate: true },
  })

  if (!requirement) {
    return Response.json({ error: 'Requirement not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (requirement.evaluatorType !== assignment.evaluatorType) {
    return Response.json(
      {
        error: `This requirement is scored by ${requirement.evaluatorType} evaluators`,
        code: 'WRONG_EVALUATOR_TYPE',
      },
      { status: 403 },
    )
  }

  // UPSERT - create first score or update existing one; always produce an audit log row
  const existing = await prisma.score.findUnique({
    where: {
      evaluationId_requirementId_userId: {
        evaluationId,
        requirementId,
        userId: session.user.id,
      },
    },
    select: { id: true },
  })

  let threadAutoClosedForReq = false
  let score
  if (existing) {
    // updateScore is transactional: it updates the score and writes a ScoreAuditLog row atomically
    score = await updateScore(prisma, {
      scoreId: existing.id,
      changedById: session.user.id,
      newValue: value,
      newEvidenceType: evidenceType,
      newComment: comment,
    })
  } else {
    // First-time score: create Score + initial ScoreAuditLog atomically
    score = await prisma.$transaction(async tx => {
      const created = await tx.score.create({
        data: { evaluationId, requirementId, userId: session.user.id, value, evidenceType, comment },
      })
      await tx.scoreAuditLog.create({
        data: {
          scoreId: created.id,
          changedById: session.user.id,
          previousValue: null,
          newValue: value,
          previousEvidenceType: null,
          newEvidenceType: evidenceType ?? null,
          previousComment: null,
          newComment: comment ?? null,
        },
      })
      return created
    })
  }

  // COMPLIANCE GATE - a FAIL on a gate requirement immediately disqualifies the platform
  if (value === 0 && requirement.isComplianceGate) {
    await prisma.platform.update({
      where: { id: evaluation.platformId },
      data: { status: 'DISQUALIFIED' },
    })
  }

  // Auto-close conflict thread if scores converged during MERGED review
  if (evaluation.state === 'MERGED') {
    const reqScores = await prisma.score.findMany({
      where: { evaluationId, requirementId },
      select: { value: true },
    })
    const numericScores = reqScores.filter(s => s.value !== null).map(s => s.value as number)
    if (numericScores.length >= 2) {
      const maxDiff = Math.max(...numericScores) - Math.min(...numericScores)
      if (maxDiff === 0) {
        await prisma.conflictThread.updateMany({
          where: { evaluationId, requirementId, isClosed: false },
          data: { isClosed: true, closedAt: new Date(), closedById: session.user.id },
        })
        threadAutoClosedForReq = true
      }
    }
  }

  // AUTO-TRANSITION - advance state as work completes
  let evaluationState = evaluation.state
  if (evaluation.state === 'IN_PROGRESS') {
    const allSubmitted = await checkAllTeamsSubmitted(evaluationId)
    if (allSubmitted) {
      const transition = await transitionEvaluation(evaluationId, 'MERGED', session.user.id)
      if (transition.ok) {
        evaluationState = 'MERGED'
        if ((transition.conflictCount ?? 0) === 0) {
          const finalised = await autoFinaliseIfReady(evaluationId, session.user.id)
          if (finalised) evaluationState = 'FINALISED'
        }
      }
    }
  } else if (evaluation.state === 'MERGED' && threadAutoClosedForReq) {
    // Score convergence may have closed the last open thread - try to finalise
    const finalised = await autoFinaliseIfReady(evaluationId, session.user.id)
    if (finalised) evaluationState = 'FINALISED'
  }

  return Response.json(
    { score, evaluationState, threadAutoClosed: threadAutoClosedForReq },
    { status: existing ? 200 : 201 },
  )
}

// ─── GET - fetch scores, with isolation enforced at the query level ────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id: evaluationId } = await params

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: { id: true, state: true, lockedAt: true },
  })

  if (!evaluation) {
    return Response.json({ error: 'Evaluation not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const role = session.user.role
  const seeAllScores = canDo(role, 'view:all_scores') // ADMIN + VIEWER

  // ── Branch A: IN_PROGRESS for a regular evaluator - own scores only ──────────
  //
  // The WHERE clause `userId: session.user.id` is the isolation mechanism.
  // The server never fetches cross-team rows and filters in memory - they
  // simply are not queried.
  if (evaluation.state === 'IN_PROGRESS' && !seeAllScores) {
    if (!canDo(role, 'access:evaluate')) {
      return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const assignment = await prisma.evaluatorAssignment.findUnique({
      where: { evaluationId_userId: { evaluationId, userId: session.user.id } },
      select: { evaluatorType: true, hasSubmitted: true, submittedAt: true },
    })

    if (!assignment) {
      return Response.json(
        { error: 'You are not assigned to this evaluation', code: 'NOT_ASSIGNED' },
        { status: 403 },
      )
    }

    // Requirements are scoped to this evaluator's type - DB-level filter
    const [requirements, ownScores] = await Promise.all([
      prisma.requirement.findMany({
        where: { evaluatorType: assignment.evaluatorType }, // ← DB-level filter
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
      }),
      prisma.score.findMany({
        where: {
          evaluationId,
          userId: session.user.id, // ← DB-level isolation - no cross-team rows fetched
        },
        select: { id: true, requirementId: true, value: true, evidenceType: true, comment: true },
      }),
    ])

    return Response.json({
      state: evaluation.state,
      requirements,
      ownScores,
      assignment,
    })
  }

  // ── Branch B: MERGED / FINALISED, or a role with view:all_scores ─────────────
  //
  // No userId filter - all scores are returned so the UI can show them side by side.
  // VIEWERs may only observe FINALISED evaluations; they are excluded from the active MERGED phase.
  if (evaluation.state === 'MERGED' && !canDo(role, 'access:evaluate')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }
  if (!seeAllScores && !canDo(role, 'access:evaluate')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const [requirements, allScores, assignments, threads] = await Promise.all([
    prisma.requirement.findMany({
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    }),
    prisma.score.findMany({
      where: { evaluationId }, // ← no userId clause - full cross-team visibility
      select: {
        id: true,
        requirementId: true,
        value: true,
        evidenceType: true,
        comment: true,
        userId: true,
        user: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.evaluatorAssignment.findMany({
      where: { evaluationId },
      select: { userId: true, evaluatorType: true },
    }),
    prisma.conflictThread.findMany({
      where: { evaluationId },
      select: { id: true, requirementId: true, isClosed: true },
    }),
  ])

  // userId → evaluatorType map built from the assignment table (single query, not nested)
  const evaluatorTypeByUser = new Map(assignments.map(a => [a.userId, a.evaluatorType]))

  // Build a requirementId → thread lookup
  const threadByRequirement = new Map(threads.map(t => [t.requirementId, t]))

  // Group scores by requirementId
  const scoresByRequirement = new Map<string, typeof allScores>()
  for (const s of allScores) {
    const group = scoresByRequirement.get(s.requirementId) ?? []
    group.push(s)
    scoresByRequirement.set(s.requirementId, group)
  }

  const crossTeamScores = requirements.map(req => {
    const scores = (scoresByRequirement.get(req.id) ?? []).map(s => ({
      scoreId: s.id,
      userId: s.userId,
      userName: s.user.name,
      userRole: s.user.role,
      evaluatorType: evaluatorTypeByUser.get(s.userId) ?? null,
      value: s.value,
      evidenceType: s.evidenceType,
      comment: s.comment,
    }))

    const thread = threadByRequirement.get(req.id)
    return {
      requirementId: req.id,
      scores,
      hasConflict: thread !== undefined,
      conflictThreadId: thread?.id ?? null,
      threadIsClosed: thread?.isClosed ?? null,
    }
  })

  const openThreads = threads.filter(t => !t.isClosed).length

  return Response.json({
    state: evaluation.state,
    requirements,
    crossTeamScores,
    threads: {
      total: threads.length,
      open: openThreads,
      closed: threads.length - openThreads,
    },
  })
}
