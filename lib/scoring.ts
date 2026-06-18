import type { EvidenceType, WeightLevel } from '@prisma/client'

// ─── Input types (plain data, no Prisma references) ───────────────────────────

export type Score = {
  requirementId: string
  value: number | null        // null = N/A, 0 = FAIL (compliance gate only), 1-4 = score
  evidenceType: EvidenceType | null
}

export type Requirement = {
  id: string
  weight: WeightLevel
  category: string | null
  isComplianceGate: boolean
  contextIds: string[]
}

// ─── Constants ─────────────────────────────────────────────────────────────────

export const WEIGHT_MULTIPLIER: Record<WeightLevel, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

const HIGH_CONFIDENCE: EvidenceType[] = ['TRIAL', 'DEMO']
const LOW_CONFIDENCE: EvidenceType[] = ['DOCUMENTATION', 'VENDOR_CLAIM']

const BUILD_READINESS_KEYWORDS = ['api', 'lti', 'export', 'sso', 'integration', 'interoperability']

// ─── Internal helpers ──────────────────────────────────────────────────────────

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function buildScoreMap(scores: Score[]): Map<string, number[]> {
  const map = new Map<string, number[]>()
  for (const s of scores) {
    if (s.value === null) continue
    const arr = map.get(s.requirementId) ?? []
    arr.push(s.value)
    map.set(s.requirementId, arr)
  }
  return map
}

// ─── Public functions ──────────────────────────────────────────────────────────

/**
 * Returns the raw weighted score: sum of (combinedAvg × weightMultiplier) across
 * all requirements that have at least one non-N/A score. N/A scores are excluded.
 */
export function calculateWeightedScore(scores: Score[], requirements: Requirement[]): number {
  const scoreMap = buildScoreMap(scores)
  let total = 0
  for (const req of requirements) {
    const vals = scoreMap.get(req.id)
    const a = avg(vals ?? [])
    if (a === null) continue
    total += a * WEIGHT_MULTIPLIER[req.weight]
  }
  return total
}

/**
 * Returns the weighted percentage (0-100).
 * Formula: sum(combinedAvg × multiplier) / sum(4 × multiplier) × 100
 * Only requirements with ≥1 scored value contribute to the denominator.
 * Returns 0 when no requirement has any non-N/A score.
 */
export function calculateWeightedPercentage(scores: Score[], requirements: Requirement[]): number {
  const scoreMap = buildScoreMap(scores)
  let numerator = 0
  let denominator = 0
  for (const req of requirements) {
    const vals = scoreMap.get(req.id)
    const a = avg(vals ?? [])
    if (a === null) continue
    const m = WEIGHT_MULTIPLIER[req.weight]
    // Compliance gates are scored 0 (No) or 1 (Yes), so max is 1, not 4
    const maxScore = req.isComplianceGate ? 1 : 4
    numerator += a * m
    denominator += maxScore * m
  }
  if (denominator === 0) return 0
  return (numerator / denominator) * 100
}

/**
 * Filters scores and requirements to those belonging to a given context.
 * Returns the scores whose requirement is in that context.
 * If contextId is null, returns all scores unchanged.
 */
export function filterByContext(
  scores: Score[],
  requirements: Requirement[],
  contextId: string | null,
): Score[] {
  if (contextId === null) return scores
  const inContext = new Set(
    requirements.filter(r => r.contextIds.includes(contextId)).map(r => r.id),
  )
  return scores.filter(s => inContext.has(s.requirementId))
}

/**
 * Applies context-specific weight overrides to a set of requirements.
 * Returns a new array where each requirement's `weight` is replaced by the
 * context override when one is present; requirements without an override
 * retain their global weight.
 *
 * @param requirements  Full requirement list
 * @param overrides     Map of requirementId -> context-specific WeightLevel
 */
export function applyContextWeights(
  requirements: Requirement[],
  overrides: Map<string, WeightLevel>,
): Requirement[] {
  if (overrides.size === 0) return requirements
  return requirements.map(r => {
    const override = overrides.get(r.id)
    return override ? { ...r, weight: override } : r
  })
}

/**
 * Maps a weighted percentage to a procurement recommendation tier.
 * Disqualification is a platform status (compliance gate failure), never a score outcome.
 */
export function getRecommendedAction(
  percentage: number,
): 'TOP_PICK' | 'RECOMMENDED' | 'CONSIDER' | 'NOT_RECOMMENDED' {
  if (percentage >= 85) return 'TOP_PICK'
  if (percentage >= 70) return 'RECOMMENDED'
  if (percentage >= 50) return 'CONSIDER'
  return 'NOT_RECOMMENDED'
}

// ─── Pipeline aggregate scoring ─────────────────────────────────────────────────

export type StageWeights = { ai: number; cefr: number; vital: number; prd: number }
export type StageScores = {
  ai: number | null
  cefr: number | null
  vital: number | null
  prd: number | null
}

export const DEFAULT_STAGE_WEIGHTS: StageWeights = { ai: 20, cefr: 40, vital: 30, prd: 10 }

/**
 * Weighted aggregate (0-100) across the four pipeline stages. Each component is a
 * 0-100 score; missing components are excluded and the remaining weights are
 * renormalised over the present ones, so a partially-evaluated tool still gets a
 * fair provisional aggregate. Returns 0 when nothing is scored.
 */
export function calculateAggregateScore(scores: StageScores, weights: StageWeights): number {
  const parts: Array<[number, number]> = []
  if (scores.ai !== null) parts.push([scores.ai, weights.ai])
  if (scores.cefr !== null) parts.push([scores.cefr, weights.cefr])
  if (scores.vital !== null) parts.push([scores.vital, weights.vital])
  if (scores.prd !== null) parts.push([scores.prd, weights.prd])
  const weightSum = parts.reduce((s, [, w]) => s + w, 0)
  if (weightSum === 0) return 0
  return parts.reduce((s, [v, w]) => s + v * w, 0) / weightSum
}

/**
 * Calculates the ratio of high-confidence to low-confidence evidence across
 * all scores. Scores without an evidenceType are excluded from both counts.
 *
 * - high: TRIAL + DEMO
 * - low: DOCUMENTATION + VENDOR_CLAIM
 * - percentage: high / (high + low) × 100, or 0 when no evidence present
 */
export function calculateEvidenceQuality(
  scores: Score[],
): { high: number; low: number; percentage: number } {
  let high = 0
  let low = 0
  for (const s of scores) {
    if (s.evidenceType === null) continue
    if ((HIGH_CONFIDENCE as string[]).includes(s.evidenceType)) high++
    else if ((LOW_CONFIDENCE as string[]).includes(s.evidenceType)) low++
  }
  const total = high + low
  return { high, low, percentage: total === 0 ? 0 : (high / total) * 100 }
}

/**
 * Returns the weighted percentage for requirements in build-readiness categories:
 * API, LTI, data export, SSO, integration, interoperability (case-insensitive keyword match).
 * Returns 0 when no matching requirements exist or none are scored.
 */
export function calculateBuildReadinessScore(
  scores: Score[],
  requirements: Requirement[],
): number {
  const buildReqs = requirements.filter(r =>
    r.category !== null &&
    BUILD_READINESS_KEYWORDS.some(kw => r.category!.toLowerCase().includes(kw)),
  )
  return calculateWeightedPercentage(scores, buildReqs)
}
