import { describe, expect, it } from 'vitest'
import {
  calculateWeightedScore,
  calculateWeightedPercentage,
  filterByContext,
  getRecommendedAction,
  calculateEvidenceQuality,
  calculateBuildReadinessScore,
  WEIGHT_MULTIPLIER,
} from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function req(overrides: Partial<Requirement> & { id: string }): Requirement {
  return {
    weight: 'MEDIUM',
    category: null,
    isComplianceGate: false,
    contextIds: [],
    ...overrides,
  }
}

function score(overrides: Partial<Score> & { requirementId: string }): Score {
  return {
    value: 2,
    evidenceType: null,
    ...overrides,
  }
}

// ─── WEIGHT_MULTIPLIER ────────────────────────────────────────────────────────

describe('WEIGHT_MULTIPLIER', () => {
  it('has correct values for each tier', () => {
    expect(WEIGHT_MULTIPLIER.HIGH).toBe(3)
    expect(WEIGHT_MULTIPLIER.MEDIUM).toBe(2)
    expect(WEIGHT_MULTIPLIER.LOW).toBe(1)
  })
})

// ─── calculateWeightedScore ───────────────────────────────────────────────────

describe('calculateWeightedScore()', () => {
  it('returns 0 when scores array is empty', () => {
    const reqs = [req({ id: 'r1' })]
    expect(calculateWeightedScore([], reqs)).toBe(0)
  })

  it('returns 0 when all scores are N/A (null value)', () => {
    const reqs = [req({ id: 'r1' })]
    const scores = [score({ requirementId: 'r1', value: null })]
    expect(calculateWeightedScore(scores, reqs)).toBe(0)
  })

  it('computes score × multiplier for a single requirement', () => {
    const reqs = [req({ id: 'r1', weight: 'HIGH' })]
    const scores = [score({ requirementId: 'r1', value: 3 })]
    // avg=3, multiplier=3 → 3×3 = 9
    expect(calculateWeightedScore(scores, reqs)).toBe(9)
  })

  it('averages multiple scores for the same requirement', () => {
    const reqs = [req({ id: 'r1', weight: 'LOW' })]
    const scores = [
      score({ requirementId: 'r1', value: 1 }),
      score({ requirementId: 'r1', value: 3 }),
    ]
    // avg=2, multiplier=1 → 2×1 = 2
    expect(calculateWeightedScore(scores, reqs)).toBe(2)
  })

  it('sums across multiple requirements with different weights', () => {
    const reqs = [
      req({ id: 'r1', weight: 'HIGH' }),    // avg=2, mult=3 → 6
      req({ id: 'r2', weight: 'LOW' }),     // avg=1, mult=1 → 1
    ]
    const scores = [
      score({ requirementId: 'r1', value: 2 }),
      score({ requirementId: 'r2', value: 1 }),
    ]
    expect(calculateWeightedScore(scores, reqs)).toBe(7)
  })

  it('excludes requirements with no scores from the total', () => {
    const reqs = [req({ id: 'r1', weight: 'HIGH' }), req({ id: 'r2', weight: 'HIGH' })]
    const scores = [score({ requirementId: 'r1', value: 3 })]
    // r2 has no scores → contributes 0
    expect(calculateWeightedScore(scores, reqs)).toBe(9)
  })

  it('ignores scores for requirements not in the requirements array', () => {
    const reqs = [req({ id: 'r1', weight: 'MEDIUM' })]
    const scores = [
      score({ requirementId: 'r1', value: 2 }),
      score({ requirementId: 'UNKNOWN', value: 3 }),
    ]
    // avg r1=2, mult=2 → 4
    expect(calculateWeightedScore(scores, reqs)).toBe(4)
  })
})

// ─── calculateWeightedPercentage ──────────────────────────────────────────────

describe('calculateWeightedPercentage()', () => {
  it('returns 0 when no requirements are scored', () => {
    const reqs = [req({ id: 'r1' })]
    expect(calculateWeightedPercentage([], reqs)).toBe(0)
  })

  it('returns 0 when all scores are N/A', () => {
    const reqs = [req({ id: 'r1' })]
    const scores = [score({ requirementId: 'r1', value: null })]
    expect(calculateWeightedPercentage(scores, reqs)).toBe(0)
  })

  it('returns 100 for a perfect score on a single requirement', () => {
    const reqs = [req({ id: 'r1', weight: 'HIGH' })]
    const scores = [score({ requirementId: 'r1', value: 3 })]
    // numerator=3×3=9, denominator=3×3=9 → 100%
    expect(calculateWeightedPercentage(scores, reqs)).toBe(100)
  })

  it('returns 50 when avg score is 1.5 out of 3', () => {
    const reqs = [req({ id: 'r1', weight: 'MEDIUM' })]
    const scores = [
      score({ requirementId: 'r1', value: 1 }),
      score({ requirementId: 'r1', value: 2 }),
    ]
    // avg=1.5, num=1.5×2=3, denom=3×2=6 → 50%
    expect(calculateWeightedPercentage(scores, reqs)).toBe(50)
  })

  it('does not penalise N/A requirements — they are excluded from denominator', () => {
    const reqs = [
      req({ id: 'r1', weight: 'HIGH' }),
      req({ id: 'r2', weight: 'HIGH' }),  // all N/A — should not drag score down
    ]
    const scores = [
      score({ requirementId: 'r1', value: 3 }),
      score({ requirementId: 'r2', value: null }),
    ]
    // only r1 scored: num=9, denom=9 → 100%
    expect(calculateWeightedPercentage(scores, reqs)).toBe(100)
  })

  it('correctly weights HIGH more than LOW', () => {
    const reqs = [
      req({ id: 'r1', weight: 'HIGH' }),  // avg=3, num=9, denom=9
      req({ id: 'r2', weight: 'LOW' }),   // avg=1, num=1, denom=3
    ]
    const scores = [
      score({ requirementId: 'r1', value: 3 }),
      score({ requirementId: 'r2', value: 1 }),
    ]
    // num=10, denom=12 → 83.33...%
    expect(calculateWeightedPercentage(scores, reqs)).toBeCloseTo(83.33, 1)
  })

  it('matches the formula used in FinalisedView.tsx', () => {
    // FinalisedView: (weightedSum / weightedDenom) / 3 * 100
    // where weightedSum = sum(avg * mult), weightedDenom = sum(mult for scored reqs)
    const reqs = [
      req({ id: 'r1', weight: 'HIGH' }),
      req({ id: 'r2', weight: 'MEDIUM' }),
    ]
    const scores = [
      score({ requirementId: 'r1', value: 2 }),
      score({ requirementId: 'r2', value: 3 }),
    ]
    const weightedSum = 2 * 3 + 3 * 2   // 6 + 6 = 12
    const weightedDenom = 3 + 2          // 5
    const finalisedViewResult = (weightedSum / weightedDenom) / 3 * 100
    expect(calculateWeightedPercentage(scores, reqs)).toBeCloseTo(finalisedViewResult, 10)
  })
})

// ─── filterByContext ──────────────────────────────────────────────────────────

describe('filterByContext()', () => {
  const reqs = [
    req({ id: 'r1', contextIds: ['ctx-a'] }),
    req({ id: 'r2', contextIds: ['ctx-b'] }),
    req({ id: 'r3', contextIds: ['ctx-a', 'ctx-b'] }),
  ]
  const scores = [
    score({ requirementId: 'r1' }),
    score({ requirementId: 'r2' }),
    score({ requirementId: 'r3' }),
  ]

  it('returns all scores when contextId is null', () => {
    expect(filterByContext(scores, reqs, null)).toHaveLength(3)
  })

  it('returns only scores whose requirement belongs to the given context', () => {
    const result = filterByContext(scores, reqs, 'ctx-a')
    expect(result.map(s => s.requirementId).sort()).toEqual(['r1', 'r3'])
  })

  it('handles a context with no matching requirements', () => {
    expect(filterByContext(scores, reqs, 'ctx-zzz')).toHaveLength(0)
  })

  it('returns an empty array when scores is empty', () => {
    expect(filterByContext([], reqs, 'ctx-a')).toHaveLength(0)
  })
})

// ─── getRecommendedAction ─────────────────────────────────────────────────────

describe('getRecommendedAction()', () => {
  it('returns TOP_PICK at exactly 85', () => {
    expect(getRecommendedAction(85)).toBe('TOP_PICK')
  })

  it('returns TOP_PICK above 85', () => {
    expect(getRecommendedAction(100)).toBe('TOP_PICK')
    expect(getRecommendedAction(92.5)).toBe('TOP_PICK')
  })

  it('returns RECOMMENDED between 70 and 84.9', () => {
    expect(getRecommendedAction(70)).toBe('RECOMMENDED')
    expect(getRecommendedAction(84.9)).toBe('RECOMMENDED')
    expect(getRecommendedAction(77)).toBe('RECOMMENDED')
  })

  it('returns CONSIDER between 50 and 69.9', () => {
    expect(getRecommendedAction(50)).toBe('CONSIDER')
    expect(getRecommendedAction(69.9)).toBe('CONSIDER')
    expect(getRecommendedAction(60)).toBe('CONSIDER')
  })

  it('returns DISQUALIFIED below 50', () => {
    expect(getRecommendedAction(49.9)).toBe('DISQUALIFIED')
    expect(getRecommendedAction(0)).toBe('DISQUALIFIED')
  })
})

// ─── calculateEvidenceQuality ─────────────────────────────────────────────────

describe('calculateEvidenceQuality()', () => {
  it('returns zeros and 0% when no scores have evidenceType', () => {
    const result = calculateEvidenceQuality([
      score({ requirementId: 'r1', evidenceType: null }),
    ])
    expect(result).toEqual({ high: 0, low: 0, percentage: 0 })
  })

  it('returns zeros and 0% for an empty scores array', () => {
    expect(calculateEvidenceQuality([])).toEqual({ high: 0, low: 0, percentage: 0 })
  })

  it('counts TRIAL and DEMO as high confidence', () => {
    const scores = [
      score({ requirementId: 'r1', evidenceType: 'TRIAL' }),
      score({ requirementId: 'r2', evidenceType: 'DEMO' }),
    ]
    const result = calculateEvidenceQuality(scores)
    expect(result.high).toBe(2)
    expect(result.low).toBe(0)
    expect(result.percentage).toBe(100)
  })

  it('counts DOCUMENTATION and VENDOR_CLAIM as low confidence', () => {
    const scores = [
      score({ requirementId: 'r1', evidenceType: 'DOCUMENTATION' }),
      score({ requirementId: 'r2', evidenceType: 'VENDOR_CLAIM' }),
    ]
    const result = calculateEvidenceQuality(scores)
    expect(result.high).toBe(0)
    expect(result.low).toBe(2)
    expect(result.percentage).toBe(0)
  })

  it('calculates percentage correctly for a mixed set', () => {
    const scores = [
      score({ requirementId: 'r1', evidenceType: 'TRIAL' }),
      score({ requirementId: 'r2', evidenceType: 'DEMO' }),
      score({ requirementId: 'r3', evidenceType: 'DOCUMENTATION' }),
      score({ requirementId: 'r4', evidenceType: 'VENDOR_CLAIM' }),
    ]
    const result = calculateEvidenceQuality(scores)
    expect(result.high).toBe(2)
    expect(result.low).toBe(2)
    expect(result.percentage).toBe(50)
  })

  it('excludes null evidenceType from both counts', () => {
    const scores = [
      score({ requirementId: 'r1', evidenceType: 'TRIAL' }),
      score({ requirementId: 'r2', evidenceType: null }),
    ]
    const result = calculateEvidenceQuality(scores)
    expect(result.high).toBe(1)
    expect(result.low).toBe(0)
    expect(result.percentage).toBe(100)
  })
})

// ─── calculateBuildReadinessScore ─────────────────────────────────────────────

describe('calculateBuildReadinessScore()', () => {
  it('returns 0 when no requirements match build-readiness keywords', () => {
    const reqs = [req({ id: 'r1', category: 'Pedagogy' })]
    const scores = [score({ requirementId: 'r1', value: 3 })]
    expect(calculateBuildReadinessScore(scores, reqs)).toBe(0)
  })

  it('returns 0 when requirements array is empty', () => {
    expect(calculateBuildReadinessScore([], [])).toBe(0)
  })

  it('matches the "api" keyword (case-insensitive)', () => {
    const reqs = [req({ id: 'r1', category: 'API Gateway', weight: 'HIGH' })]
    const scores = [score({ requirementId: 'r1', value: 3 })]
    expect(calculateBuildReadinessScore(scores, reqs)).toBe(100)
  })

  it('matches the "lti" keyword', () => {
    const reqs = [req({ id: 'r1', category: 'LTI Integration', weight: 'HIGH' })]
    const scores = [score({ requirementId: 'r1', value: 3 })]
    expect(calculateBuildReadinessScore(scores, reqs)).toBe(100)
  })

  it('matches the "sso" keyword', () => {
    const reqs = [req({ id: 'r1', category: 'SSO / SAML', weight: 'MEDIUM' })]
    const scores = [score({ requirementId: 'r1', value: 3 })]
    expect(calculateBuildReadinessScore(scores, reqs)).toBe(100)
  })

  it('matches the "export" keyword', () => {
    const reqs = [req({ id: 'r1', category: 'Data Export Standards', weight: 'LOW' })]
    const scores = [score({ requirementId: 'r1', value: 3 })]
    expect(calculateBuildReadinessScore(scores, reqs)).toBe(100)
  })

  it('matches the "integration" keyword', () => {
    const reqs = [req({ id: 'r1', category: 'Third-Party Integration', weight: 'MEDIUM' })]
    const scores = [score({ requirementId: 'r1', value: 3 })]
    expect(calculateBuildReadinessScore(scores, reqs)).toBe(100)
  })

  it('excludes non-matching requirements when computing the score', () => {
    const reqs = [
      req({ id: 'r1', category: 'API Access', weight: 'HIGH' }),
      req({ id: 'r2', category: 'Content Quality', weight: 'HIGH' }),
    ]
    const scores = [
      score({ requirementId: 'r1', value: 3 }),
      score({ requirementId: 'r2', value: 1 }),
    ]
    // Only r1 is build-readiness: 100%
    expect(calculateBuildReadinessScore(scores, reqs)).toBe(100)
  })

  it('returns 0 when matching requirements exist but none are scored', () => {
    const reqs = [req({ id: 'r1', category: 'API Access', weight: 'HIGH' })]
    const scores = [score({ requirementId: 'r1', value: null })]
    expect(calculateBuildReadinessScore(scores, reqs)).toBe(0)
  })

  it('handles requirements with null category gracefully', () => {
    const reqs = [req({ id: 'r1', category: null })]
    const scores = [score({ requirementId: 'r1', value: 3 })]
    expect(calculateBuildReadinessScore(scores, reqs)).toBe(0)
  })
})
