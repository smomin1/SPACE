import type { PipelineStage, PipelineStageStatus } from '@prisma/client'
import { calculateAggregateScore, type StageScores, type StageWeights } from '@/lib/scoring'

// ─── Pipeline rules (pure, no DB) ───────────────────────────────────────────────
//
// The four stages run in a fixed linear order. A stage PASSES at score >= its
// threshold; passing (or skipping) a stage auto-queues the next one. These
// functions derive stage statuses and the aggregate purely from the current
// per-stage scores + config, so the whole chain can be recomputed idempotently.

export const STAGE_ORDER: PipelineStage[] = ['AI_SCREENING', 'CEFR', 'VITAL', 'PRD']

export const STAGE_LABELS: Record<PipelineStage, string> = {
  AI_SCREENING: 'AI Screening',
  CEFR: 'CEFR',
  VITAL: 'VITAL',
  PRD: 'PRD',
}

export type PipelineConfigLike = {
  aiThreshold: number
  cefrThreshold: number
  vitalThreshold: number
  prdThreshold: number
  aiWeight: number
  cefrWeight: number
  vitalWeight: number
  prdWeight: number
}

export type StageScoreMap = Record<PipelineStage, number | null>

export type StageResult = {
  stage: PipelineStage
  status: PipelineStageStatus
  score: number | null
  threshold: number
}

export function thresholdFor(config: PipelineConfigLike, stage: PipelineStage): number {
  switch (stage) {
    case 'AI_SCREENING': return config.aiThreshold
    case 'CEFR': return config.cefrThreshold
    case 'VITAL': return config.vitalThreshold
    case 'PRD': return config.prdThreshold
  }
}

export function weightsFromConfig(config: PipelineConfigLike): StageWeights {
  return { ai: config.aiWeight, cefr: config.cefrWeight, vital: config.vitalWeight, prd: config.prdWeight }
}

export function nextStage(stage: PipelineStage): PipelineStage | null {
  const i = STAGE_ORDER.indexOf(stage)
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null
}

/**
 * Derive each stage's status from its score and the linear gate. A stage with a
 * score PASSES/FAILS against its threshold; a scoreless stage is QUEUED once its
 * predecessor has advanced (PASSED or SKIPPED), otherwise NOT_STARTED. Manually
 * skipped stages stay SKIPPED and count as advanced for gating.
 */
export function computePipeline(
  scores: StageScoreMap,
  config: PipelineConfigLike,
  skipped: Set<PipelineStage> = new Set(),
): StageResult[] {
  const results: StageResult[] = []
  let prevAdvanced = true // before the entry stage, treat as advanced so AI can queue
  for (const stage of STAGE_ORDER) {
    const threshold = thresholdFor(config, stage)
    const score = scores[stage]
    let status: PipelineStageStatus
    if (skipped.has(stage)) {
      status = 'SKIPPED'
    } else if (score !== null) {
      status = score >= threshold ? 'PASSED' : 'FAILED'
    } else {
      status = prevAdvanced ? 'QUEUED' : 'NOT_STARTED'
    }
    results.push({ stage, status, score, threshold })
    prevAdvanced = status === 'PASSED' || status === 'SKIPPED'
  }
  return results
}

/** A platform has cleared the pipeline when every stage is PASSED or SKIPPED. */
export function isPipelineComplete(results: StageResult[]): boolean {
  return results.every((r) => r.status === 'PASSED' || r.status === 'SKIPPED')
}

/** Weighted aggregate (0–100) from the per-stage scores and config weights. */
export function aggregateFromScores(scores: StageScoreMap, config: PipelineConfigLike): number {
  const s: StageScores = {
    ai: scores.AI_SCREENING,
    cefr: scores.CEFR,
    vital: scores.VITAL,
    prd: scores.PRD,
  }
  return calculateAggregateScore(s, weightsFromConfig(config))
}
