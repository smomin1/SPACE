import type { PipelineStage } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { coveragePercent } from '@/lib/screening'
import { calculateWeightedPercentage, type Requirement, type Score } from '@/lib/scoring'
import { computePipeline, nextStage, STAGE_LABELS, type StageScoreMap, type StageResult } from '@/lib/pipeline'
import { notifyAdmins } from '@/lib/notifications'

// ─── Pipeline orchestration (DB) ────────────────────────────────────────────────
// Derives each stage's score from its source module and syncs the per-platform
// PipelineStageRun rows. Idempotent: safe to call after any evaluation changes or
// on demand (e.g. when the admin board loads).

type Derived = Record<PipelineStage, { score: number | null; sourceId: string | null }>

/** Pull the current score for each stage from the underlying source records. */
export async function deriveStageScores(platformId: string): Promise<Derived> {
  const [ai, cefr, vital, evals, requirements] = await Promise.all([
    prisma.searchEvaluation.findFirst({
      where: { platformId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, responses: { select: { answer: true } } },
    }),
    prisma.cefrEvaluation.findUnique({
      where: { platformId },
      select: { id: true, status: true, alignmentPct: true },
    }),
    prisma.vitalTool.findFirst({
      where: { platformId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, v2Percent: true },
    }),
    prisma.evaluation.findMany({
      where: { platformId },
      select: {
        id: true,
        state: true,
        scores: { select: { requirementId: true, value: true, evidenceType: true } },
      },
    }),
    prisma.requirement.findMany({
      select: { id: true, weight: true, category: true, isComplianceGate: true },
    }),
  ])

  const aiScore = ai ? coveragePercent(ai.responses) : null
  const cefrScore = cefr && cefr.status === 'COMPLETED' && cefr.alignmentPct != null ? cefr.alignmentPct : null
  const vitalScore = vital && vital.v2Percent != null ? vital.v2Percent : null

  // PRD = the best existing Evaluation's weighted % (prefer FINALISED > MERGED > IN_PROGRESS).
  let prdScore: number | null = null
  let prdSourceId: string | null = null
  if (evals.length > 0) {
    const rank: Record<string, number> = { FINALISED: 3, MERGED: 2, IN_PROGRESS: 1 }
    const best = [...evals].sort((a, b) => (rank[b.state] ?? 0) - (rank[a.state] ?? 0))[0]
    const reqs: Requirement[] = requirements.map((r) => ({ ...r, contextIds: [] }))
    prdScore = calculateWeightedPercentage(best.scores as Score[], reqs)
    prdSourceId = best.id
  }

  return {
    AI_SCREENING: { score: aiScore, sourceId: ai?.id ?? null },
    CEFR: { score: cefrScore, sourceId: cefr?.id ?? null },
    VITAL: { score: vitalScore, sourceId: vital?.id ?? null },
    PRD: { score: prdScore, sourceId: prdSourceId },
  }
}

export async function getOrCreateConfig() {
  const existing = await prisma.pipelineConfig.findUnique({ where: { id: 'singleton' } })
  return existing ?? prisma.pipelineConfig.create({ data: { id: 'singleton' } })
}

type PipelineConfigRow = Awaited<ReturnType<typeof getOrCreateConfig>>

/**
 * Read-only: derive a platform's stage scores and compute its stage statuses
 * (honouring manual skips) without writing. Shared by the sync and the report.
 */
export async function evaluatePlatformPipeline(platformId: string, config?: PipelineConfigRow) {
  const cfg = config ?? (await getOrCreateConfig())
  const [derived, existing] = await Promise.all([
    deriveStageScores(platformId),
    prisma.pipelineStageRun.findMany({ where: { platformId } }),
  ])
  const skipped = new Set(existing.filter((r) => r.status === 'SKIPPED').map((r) => r.stage))
  const scoreMap: StageScoreMap = {
    AI_SCREENING: derived.AI_SCREENING.score,
    CEFR: derived.CEFR.score,
    VITAL: derived.VITAL.score,
    PRD: derived.PRD.score,
  }
  const results = computePipeline(scoreMap, cfg, skipped)
  return { results, derived, existing, config: cfg }
}

/** Recompute and persist a platform's stage runs from current source data. */
export async function syncPlatformPipeline(platformId: string): Promise<StageResult[]> {
  const { results, derived, existing } = await evaluatePlatformPipeline(platformId)
  const byStage = new Map(existing.map((r) => [r.stage, r]))

  // Stages that newly reach PASSED this sync — used to notify admins once.
  const newlyPassed: StageResult[] = []

  for (const r of results) {
    const prev = byStage.get(r.stage)
    const passedAt = r.status === 'PASSED' ? prev?.passedAt ?? new Date() : null
    if (r.status === 'PASSED' && prev?.status !== 'PASSED') newlyPassed.push(r)
    await prisma.pipelineStageRun.upsert({
      where: { platformId_stage: { platformId, stage: r.stage } },
      update: { status: r.status, score: r.score, sourceId: derived[r.stage].sourceId, passedAt },
      create: {
        platformId,
        stage: r.stage,
        status: r.status,
        score: r.score,
        sourceId: derived[r.stage].sourceId,
        passedAt,
      },
    })
  }

  if (newlyPassed.length > 0) {
    const platform = await prisma.platform.findUnique({ where: { id: platformId }, select: { name: true } })
    const name = platform?.name ?? 'A platform'
    for (const r of newlyPassed) {
      const next = nextStage(r.stage)
      const score = r.score != null ? ` (${r.score.toFixed(0)}%)` : ''
      await notifyAdmins({
        type: 'STAGE_PASSED',
        title: `${name} passed ${STAGE_LABELS[r.stage]}${score}`,
        body: next ? `Assign the ${STAGE_LABELS[next]} stage to continue the pipeline.` : 'All stages cleared — ready for the Final Report.',
        link: '/admin/pipeline',
      })
    }
  }

  return results
}

/** Sync every platform (used by the admin board). */
export async function syncAllPipelines(): Promise<void> {
  const platforms = await prisma.platform.findMany({ select: { id: true } })
  for (const p of platforms) await syncPlatformPipeline(p.id)
}

/** Manually skip (or un-skip) a stage, then re-sync. */
export async function setStageSkipped(platformId: string, stage: PipelineStage, skipped: boolean) {
  await prisma.pipelineStageRun.upsert({
    where: { platformId_stage: { platformId, stage } },
    update: { status: skipped ? 'SKIPPED' : 'NOT_STARTED' },
    create: { platformId, stage, status: skipped ? 'SKIPPED' : 'NOT_STARTED' },
  })
  return syncPlatformPipeline(platformId)
}

/** Attach an existing AI screening run to a platform so it feeds the AI stage. */
export async function linkSearchEvaluation(platformId: string, searchEvaluationId: string) {
  await prisma.searchEvaluation.update({ where: { id: searchEvaluationId }, data: { platformId } })
  return syncPlatformPipeline(platformId)
}
