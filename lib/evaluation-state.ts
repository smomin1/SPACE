import type { EvaluationState, EvaluatorType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvalStateError =
  | 'NOT_FOUND'
  | 'WRONG_STATE'
  | 'NOT_ALL_SUBMITTED'
  | 'OPEN_THREADS'
  | 'INTERNAL_ERROR'

export interface ComplianceResult {
  passed: boolean
  failedGates: { requirementId: string; requirementTitle: string }[]
}

export interface Conflict {
  requirementId: string
  requirementTitle: string
  evaluatorType: EvaluatorType  // the team that has the internal disagreement
  scores: number[]              // all non-null scores from that team's evaluators
  maxDiff: number
}

export type TransitionResult =
  | { ok: true; complianceResult?: ComplianceResult; conflictCount?: number }
  | { ok: false; error: EvalStateError; message: string }

// Minimal shape the pure helpers need — avoids coupling to Prisma's full model type
export interface EvaluationSnapshot {
  state: EvaluationState
  lockedAt: Date | null
  platformId: string
  assignments: { hasSubmitted: boolean }[]
  conflictThreads: { isClosed: boolean }[]
}

// Prisma transaction client (everything except the connection-management methods)
type Tx = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

// ─── Valid state machine ──────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<EvaluationState, EvaluationState[]> = {
  IN_PROGRESS: ['MERGED'],
  MERGED: ['FINALISED', 'IN_PROGRESS'],
  FINALISED: ['IN_PROGRESS'],
}

// ─── Pure helpers (no DB) ─────────────────────────────────────────────────────

export function isLocked(evaluation: { lockedAt: Date | null }): boolean {
  return evaluation.lockedAt !== null
}

/**
 * Returns true when the state machine allows the transition AND all
 * synchronous guards embedded in the evaluation snapshot pass.
 *
 * Async guards (all teams submitted, etc.) are checked separately inside
 * transitionEvaluation so they run within the same transaction.
 */
export function canTransitionTo(
  currentState: EvaluationState,
  newState: EvaluationState,
  evaluation: EvaluationSnapshot,
): boolean {
  if (!VALID_TRANSITIONS[currentState].includes(newState)) return false

  // MERGED → FINALISED: every conflict thread must be closed
  if (currentState === 'MERGED' && newState === 'FINALISED') {
    return evaluation.conflictThreads.every(t => t.isClosed)
  }

  return true
}

// ─── Async query helpers ──────────────────────────────────────────────────────

/**
 * Attempt to finalise the evaluation if it is in MERGED state and all conflict
 * threads are resolved. Safe to call speculatively — returns false instead of
 * throwing when the evaluation isn't ready yet.
 */
export async function autoFinaliseIfReady(
  evaluationId: string,
  actingUserId: string,
): Promise<boolean> {
  const result = await transitionEvaluation(evaluationId, 'FINALISED', actingUserId)
  return result.ok
}

export async function checkAllTeamsSubmitted(evaluationId: string): Promise<boolean> {
  const unsubmitted = await prisma.evaluatorAssignment.count({
    where: { evaluationId, hasSubmitted: false },
  })
  return unsubmitted === 0
}

/**
 * Returns every requirement where the absolute difference between any
 * PEDAGOGY score and any TECHNICAL score exceeds 1 point.
 * N/A (null) scores are excluded — they have no numeric position.
 * Intra-team differences do not trigger a conflict.
 */
export async function detectConflicts(evaluationId: string): Promise<Conflict[]> {
  const [scores, assignments] = await Promise.all([
    prisma.score.findMany({
      where: { evaluationId },
      select: {
        requirementId: true,
        userId: true,
        value: true,
        requirement: { select: { title: true } },
      },
    }),
    prisma.evaluatorAssignment.findMany({
      where: { evaluationId },
      select: { userId: true, evaluatorType: true },
    }),
  ])

  return computeConflicts(scores, assignments)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function computeConflicts(
  scores: Array<{
    requirementId: string
    userId: string
    value: number | null
    requirement: { title: string }
  }>,
  assignments: Array<{ userId: string; evaluatorType: EvaluatorType }>,
): Conflict[] {
  const typeByUser = new Map(assignments.map(a => [a.userId, a.evaluatorType]))

  const byRequirement = new Map<
    string,
    { userId: string; value: number | null; title: string }[]
  >()
  for (const s of scores) {
    const group = byRequirement.get(s.requirementId) ?? []
    group.push({ userId: s.userId, value: s.value, title: s.requirement.title })
    byRequirement.set(s.requirementId, group)
  }

  const conflicts: Conflict[] = []

  for (const [requirementId, reqScores] of byRequirement) {
    const title = reqScores[0]?.title ?? ''

    const nonNull = reqScores.filter(s => s.value !== null && typeByUser.has(s.userId))
    if (nonNull.length < 2) continue  // need ≥2 evaluators to have a disagreement

    const evaluatorType = typeByUser.get(nonNull[0].userId)!
    const values = nonNull.map(s => s.value as number)
    const maxDiff = Math.max(...values) - Math.min(...values)

    if (maxDiff > 0) {
      conflicts.push({ requirementId, requirementTitle: title, evaluatorType, scores: values, maxDiff })
    }
  }

  return conflicts
}

async function checkComplianceGates(tx: Tx, evaluationId: string): Promise<ComplianceResult> {
  const submittedUserIds = (
    await tx.evaluatorAssignment.findMany({
      where: { evaluationId, hasSubmitted: true },
      select: { userId: true },
    })
  ).map(a => a.userId)

  const failedScores = await tx.score.findMany({
    where: {
      evaluationId,
      userId: { in: submittedUserIds },
      value: 0,
      requirement: { isComplianceGate: true },
    },
    select: {
      requirementId: true,
      requirement: { select: { title: true } },
    },
  })

  const seen = new Set<string>()
  const failedGates: ComplianceResult['failedGates'] = []
  for (const s of failedScores) {
    if (!seen.has(s.requirementId)) {
      seen.add(s.requirementId)
      failedGates.push({ requirementId: s.requirementId, requirementTitle: s.requirement.title })
    }
  }

  return { passed: failedGates.length === 0, failedGates }
}

async function detectConflictsWithTx(tx: Tx, evaluationId: string): Promise<Conflict[]> {
  const [scores, assignments] = await Promise.all([
    tx.score.findMany({
      where: { evaluationId },
      select: {
        requirementId: true,
        userId: true,
        value: true,
        requirement: { select: { title: true } },
      },
    }),
    tx.evaluatorAssignment.findMany({
      where: { evaluationId },
      select: { userId: true, evaluatorType: true },
    }),
  ])

  return computeConflicts(scores, assignments)
}

// ─── Main transition orchestrator ─────────────────────────────────────────────

/**
 * Runs all guards and effects for the requested state transition inside a
 * single database transaction. The caller never needs to import Prisma directly.
 */
export async function transitionEvaluation(
  evaluationId: string,
  newState: EvaluationState,
  actingUserId: string,
  force = false,
): Promise<TransitionResult> {
  return prisma.$transaction(async tx => {
    const evaluation = await tx.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        assignments: { select: { userId: true, hasSubmitted: true, evaluatorType: true } },
        conflictThreads: { select: { isClosed: true, requirementId: true } },
      },
    })

    if (!evaluation) {
      return { ok: false, error: 'NOT_FOUND' as const, message: 'Evaluation not found' }
    }

    if (!canTransitionTo(evaluation.state, newState, evaluation)) {
      if (evaluation.state === 'MERGED' && newState === 'FINALISED') {
        const open = evaluation.conflictThreads.filter(t => !t.isClosed).length
        return {
          ok: false,
          error: 'OPEN_THREADS' as const,
          message: `${open} conflict thread(s) must be resolved before finalising`,
        }
      }
      return {
        ok: false,
        error: 'WRONG_STATE' as const,
        message: `Cannot transition from ${evaluation.state} to ${newState}`,
      }
    }

    // ── IN_PROGRESS → MERGED ──────────────────────────────────────────────────
    if (evaluation.state === 'IN_PROGRESS' && newState === 'MERGED') {
      const unsubmitted = evaluation.assignments.filter(a => !a.hasSubmitted)
      if (unsubmitted.length > 0 && !force) {
        return {
          ok: false,
          error: 'NOT_ALL_SUBMITTED' as const,
          message: `${unsubmitted.length} evaluator(s) have not submitted`,
        }
      }

      const complianceResult = await checkComplianceGates(tx as unknown as Tx, evaluationId)

      if (!complianceResult.passed) {
        await tx.platform.update({
          where: { id: evaluation.platformId },
          data: { status: 'DISQUALIFIED' },
        })
        // Disqualified platform skips conflict detection — no resolution phase needed
        await tx.evaluation.update({
          where: { id: evaluationId },
          data: { state: 'MERGED' },
        })
        return { ok: true, complianceResult, conflictCount: 0 }
      }

      const conflicts = await detectConflictsWithTx(tx as unknown as Tx, evaluationId)
      if (conflicts.length > 0) {
        await tx.conflictThread.createMany({
          data: conflicts.map(c => ({
            evaluationId,
            requirementId: c.requirementId,
            isClosed: false,
          })),
          skipDuplicates: true,
        })
      }

      await tx.evaluation.update({
        where: { id: evaluationId },
        data: { state: 'MERGED' },
      })

      return { ok: true, complianceResult, conflictCount: conflicts.length }
    }

    // ── MERGED → FINALISED ────────────────────────────────────────────────────
    if (evaluation.state === 'MERGED' && newState === 'FINALISED') {
      await tx.evaluation.update({
        where: { id: evaluationId },
        data: { state: 'FINALISED', lockedAt: new Date() },
      })
      return { ok: true }
    }

    // ── MERGED / FINALISED → IN_PROGRESS (admin reopen) ──────────────────────
    if (newState === 'IN_PROGRESS') {
      // Create an audit entry per score so the reopen event is permanently recorded
      const existingScores = await tx.score.findMany({
        where: { evaluationId },
        select: { id: true, value: true, evidenceType: true, comment: true },
      })

      if (existingScores.length > 0) {
        await tx.scoreAuditLog.createMany({
          data: existingScores.map(s => ({
            scoreId: s.id,
            changedById: actingUserId,
            previousValue: s.value,
            newValue: s.value,
            previousEvidenceType: s.evidenceType,
            newEvidenceType: s.evidenceType,
            previousComment: s.comment,
            newComment: s.comment,
            reason: 'EVALUATION_REOPENED',
          })),
        })
      }

      // Reset submission status so evaluators must re-submit; scores are preserved
      await tx.evaluatorAssignment.updateMany({
        where: { evaluationId },
        data: { hasSubmitted: false, submittedAt: null },
      })

      // Delete stale conflict threads (messages first due to FK constraint)
      const staleThreadIds = (
        await tx.conflictThread.findMany({ where: { evaluationId }, select: { id: true } })
      ).map(t => t.id)
      if (staleThreadIds.length > 0) {
        await tx.conflictMessage.deleteMany({ where: { threadId: { in: staleThreadIds } } })
        await tx.conflictThread.deleteMany({ where: { evaluationId } })
      }

      await tx.evaluation.update({
        where: { id: evaluationId },
        data: { state: 'IN_PROGRESS', lockedAt: null },
      })

      return { ok: true }
    }

    return { ok: false, error: 'INTERNAL_ERROR' as const, message: 'Unhandled transition' }
  })
}
