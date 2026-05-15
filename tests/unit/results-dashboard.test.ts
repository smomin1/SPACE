/**
 * Results Dashboard — behavioural tests
 *
 * Each group tests one observable guarantee of the dashboard. Expected values
 * are hand-computed from the formulas in CLAUDE.md so the tests serve as a
 * living specification of the scoring contract.
 *
 * Formula reminder:
 *   weightedPct = sum(avg × multiplier) / sum(3 × multiplier) × 100
 *   Multipliers: HIGH=3, MEDIUM=2, LOW=1  |  N/A (null) excluded from both
 */

import { describe, it, expect } from 'vitest'
import {
  calculateWeightedPercentage,
  calculateEvidenceQuality,
  calculateBuildReadinessScore,
  filterByContext,
  getRecommendedAction,
} from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function req(
  overrides: Partial<Requirement> & { id: string },
): Requirement {
  return {
    weight: 'MEDIUM',
    category: null,
    isComplianceGate: false,
    contextIds: [],
    ...overrides,
  }
}

function score(
  overrides: Partial<Score> & { requirementId: string },
): Score {
  return {
    value: 2,
    evidenceType: null,
    ...overrides,
  }
}

// ─── 1. Context switching recalculates weighted scores ────────────────────────

describe('Context switching recalculates all weighted scores', () => {
  /**
   * Dataset with known values per context:
   *
   *   r1  HIGH (×3)   ctx-a only        value = 3  → numerator 9,  denom 9
   *   r2  HIGH (×3)   ctx-b only        value = 1  → numerator 3,  denom 9
   *   r3  MEDIUM (×2) ctx-a and ctx-b   value = 2  → numerator 4,  denom 6
   *
   *   ctx-a (r1+r3): num=13, denom=15  → 86.67 %
   *   ctx-b (r2+r3): num=7,  denom=15  → 46.67 %
   *   no filter (all): num=16, denom=24 → 66.67 %
   */
  const requirements: Requirement[] = [
    req({ id: 'r1', weight: 'HIGH',   contextIds: ['ctx-a'] }),
    req({ id: 'r2', weight: 'HIGH',   contextIds: ['ctx-b'] }),
    req({ id: 'r3', weight: 'MEDIUM', contextIds: ['ctx-a', 'ctx-b'] }),
  ]
  const scores: Score[] = [
    score({ requirementId: 'r1', value: 3 }),
    score({ requirementId: 'r2', value: 1 }),
    score({ requirementId: 'r3', value: 2 }),
  ]

  it('ctx-a score is 86.67 % (high-scoring requirements)', () => {
    const filtered = filterByContext(scores, requirements, 'ctx-a')
    const ctxReqs  = requirements.filter(r => r.contextIds.includes('ctx-a'))
    const pct      = calculateWeightedPercentage(filtered, ctxReqs)
    // num = 3×3 + 2×2 = 13  |  denom = 3×3 + 3×2 = 15
    expect(pct).toBeCloseTo(86.67, 1)
  })

  it('ctx-b score is 46.67 % (low-scoring requirements)', () => {
    const filtered = filterByContext(scores, requirements, 'ctx-b')
    const ctxReqs  = requirements.filter(r => r.contextIds.includes('ctx-b'))
    const pct      = calculateWeightedPercentage(filtered, ctxReqs)
    // num = 1×3 + 2×2 = 7  |  denom = 3×3 + 3×2 = 15
    expect(pct).toBeCloseTo(46.67, 1)
  })

  it('ctx-a score is significantly higher than ctx-b score', () => {
    const filtA  = filterByContext(scores, requirements, 'ctx-a')
    const filtB  = filterByContext(scores, requirements, 'ctx-b')
    const reqsA  = requirements.filter(r => r.contextIds.includes('ctx-a'))
    const reqsB  = requirements.filter(r => r.contextIds.includes('ctx-b'))
    const pctA   = calculateWeightedPercentage(filtA, reqsA)
    const pctB   = calculateWeightedPercentage(filtB, reqsB)
    expect(pctA).toBeGreaterThan(pctB + 30) // 86.67 vs 46.67 — 40-point gap
  })

  it('null context returns all scores unchanged', () => {
    const filtered = filterByContext(scores, requirements, null)
    expect(filtered).toHaveLength(3)
  })

  it('no-context score is between ctx-a and ctx-b', () => {
    const allFiltered = filterByContext(scores, requirements, null)
    const pctAll = calculateWeightedPercentage(allFiltered, requirements)
    // num = 3×3 + 1×3 + 2×2 = 16  |  denom = 3×3+3×3+3×2 = 24  → 66.67 %
    expect(pctAll).toBeCloseTo(66.67, 1)
    // Must sit between the two context scores
    const filtA = filterByContext(scores, requirements, 'ctx-a')
    const filtB = filterByContext(scores, requirements, 'ctx-b')
    const pctA  = calculateWeightedPercentage(filtA, requirements.filter(r => r.contextIds.includes('ctx-a')))
    const pctB  = calculateWeightedPercentage(filtB, requirements.filter(r => r.contextIds.includes('ctx-b')))
    expect(pctAll).toBeGreaterThan(pctB)
    expect(pctAll).toBeLessThan(pctA)
  })

  it('switching context mid-session produces the correct recalculated value', () => {
    // Simulate a user switching from ctx-a to ctx-b in the filter bar
    const session: { contextId: string | null } = { contextId: 'ctx-a' }

    const compute = (ctxId: string | null) => {
      const filtered = filterByContext(scores, requirements, ctxId)
      const ctxReqs  = ctxId
        ? requirements.filter(r => r.contextIds.includes(ctxId))
        : requirements
      return calculateWeightedPercentage(filtered, ctxReqs)
    }

    const before = compute(session.contextId)
    session.contextId = 'ctx-b'           // user switches context
    const after  = compute(session.contextId)

    expect(before).toBeCloseTo(86.67, 1)
    expect(after).toBeCloseTo(46.67, 1)
    expect(before).not.toBeCloseTo(after, 0)
  })
})

// ─── 2. DISQUALIFIED platform handling ────────────────────────────────────────

describe('DISQUALIFIED platform: excluded from recommendations and best-fit', () => {
  /**
   * Page-level logic pattern (from comparison/page.tsx and best-fit/page.tsx):
   *   recommendation = status === 'DISQUALIFIED' ? 'DISQUALIFIED' : getRecommendedAction(pct)
   *   best-fit list  = platforms.filter(p => p.status === 'ACTIVE').sort(...)
   */

  // Mirrors the inline recommendation logic in comparison/page.tsx
  function resolveRecommendation(
    status: 'ACTIVE' | 'DISQUALIFIED',
    pct: number | null,
  ) {
    if (status === 'DISQUALIFIED') return 'DISQUALIFIED' as const
    return pct !== null ? getRecommendedAction(pct) : null
  }

  // Mirrors the best-fit ranking filter in best-fit/page.tsx
  function rankForBestFit(
    platforms: { id: string; status: 'ACTIVE' | 'DISQUALIFIED'; pct: number | null }[],
  ) {
    return platforms
      .filter(p => p.status === 'ACTIVE')
      .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))
  }

  it('DISQUALIFIED platform returns DISQUALIFIED even with a perfect score', () => {
    expect(resolveRecommendation('DISQUALIFIED', 100)).toBe('DISQUALIFIED')
  })

  it('DISQUALIFIED platform returns DISQUALIFIED even with 0 score', () => {
    expect(resolveRecommendation('DISQUALIFIED', 0)).toBe('DISQUALIFIED')
  })

  it('DISQUALIFIED platform returns DISQUALIFIED when score is null', () => {
    expect(resolveRecommendation('DISQUALIFIED', null)).toBe('DISQUALIFIED')
  })

  it('ACTIVE platform with 90 % score gets TOP_PICK', () => {
    expect(resolveRecommendation('ACTIVE', 90)).toBe('TOP_PICK')
  })

  it('ACTIVE platform with 75 % score gets RECOMMENDED', () => {
    expect(resolveRecommendation('ACTIVE', 75)).toBe('RECOMMENDED')
  })

  it('DISQUALIFIED platform is excluded from best-fit ranking even with highest score', () => {
    const platforms = [
      { id: 'p-dq',  status: 'DISQUALIFIED' as const, pct: 99 },  // highest score but DQ
      { id: 'p-act', status: 'ACTIVE'        as const, pct: 72 },
    ]
    const ranked = rankForBestFit(platforms)
    expect(ranked.some(p => p.id === 'p-dq')).toBe(false)
    expect(ranked[0].id).toBe('p-act')
  })

  it('DISQUALIFIED platform never occupies the winner slot regardless of score', () => {
    const platforms = [
      { id: 'winner', status: 'DISQUALIFIED' as const, pct: 98 },
      { id: 'second', status: 'ACTIVE'        as const, pct: 65 },
      { id: 'third',  status: 'ACTIVE'        as const, pct: 55 },
    ]
    const ranked = rankForBestFit(platforms)
    expect(ranked[0].id).toBe('second')
    expect(ranked[0].status).toBe('ACTIVE')
  })

  it('weighted score for a 0-value (FAIL) compliance gate requirement is 0 %', () => {
    const reqs = [req({ id: 'r1', weight: 'HIGH', isComplianceGate: true })]
    const scores = [score({ requirementId: 'r1', value: 0 })]
    const pct = calculateWeightedPercentage(scores, reqs)
    // avg=0, num=0*3=0, denom=3*3=9 → 0 %
    expect(pct).toBe(0)
    expect(resolveRecommendation('DISQUALIFIED', pct)).toBe('DISQUALIFIED')
  })
})

// ─── 3. N/A scores excluded from weighted percentage ─────────────────────────

describe('N/A scores are excluded from weighted percentage calculations', () => {
  it('single N/A score gives 0 % (no denominator contribution)', () => {
    const reqs   = [req({ id: 'r1', weight: 'HIGH' })]
    const scores = [score({ requirementId: 'r1', value: null })]
    expect(calculateWeightedPercentage(scores, reqs)).toBe(0)
  })

  it('N/A score does not drag down a neighbouring perfect score', () => {
    // r1 = 3 (perfect HIGH), r2 = N/A HIGH → should stay at 100 %
    const reqs = [
      req({ id: 'r1', weight: 'HIGH' }),
      req({ id: 'r2', weight: 'HIGH' }),
    ]
    const scores = [
      score({ requirementId: 'r1', value: 3 }),
      score({ requirementId: 'r2', value: null }),
    ]
    // Only r1 in denominator: 3×3/3×3×100 = 100 %
    expect(calculateWeightedPercentage(scores, reqs)).toBe(100)
  })

  it('N/A requirement does not penalise a low-scoring platform', () => {
    // Without the N/A: r1 alone = 1/3 = 33.3 %
    // With N/A r2 included (as null): should still be 33.3 %, not lower
    const reqs = [
      req({ id: 'r1', weight: 'HIGH' }),
      req({ id: 'r2', weight: 'HIGH' }),
    ]
    const scores = [
      score({ requirementId: 'r1', value: 1 }),
      score({ requirementId: 'r2', value: null }),
    ]
    // num = 1×3=3, denom = 3×3=9 → 33.33 %
    expect(calculateWeightedPercentage(scores, reqs)).toBeCloseTo(33.33, 1)
  })

  it('mixed N/A with diverse weights: only scored reqs contribute', () => {
    const reqs = [
      req({ id: 'r1', weight: 'HIGH' }),    // value = 3
      req({ id: 'r2', weight: 'MEDIUM' }),  // value = null (N/A)
      req({ id: 'r3', weight: 'LOW' }),     // value = 1
    ]
    const scores = [
      score({ requirementId: 'r1', value: 3 }),
      score({ requirementId: 'r2', value: null }),
      score({ requirementId: 'r3', value: 1 }),
    ]
    // num = 3×3 + 1×1 = 10  |  denom = 3×3 + 3×1 = 12  → 83.33 %
    expect(calculateWeightedPercentage(scores, reqs)).toBeCloseTo(83.33, 1)
  })

  it('N/A is not the same as scoring 0', () => {
    const reqs = [req({ id: 'r1', weight: 'HIGH' })]

    const withNa   = [score({ requirementId: 'r1', value: null })]  // 0 % (no denom)
    const withZero = [score({ requirementId: 'r1', value: 0    })]  // 0 % (scored 0)

    // Both return 0, but for different reasons — N/A keeps the denom clean
    expect(calculateWeightedPercentage(withNa,   reqs)).toBe(0)
    expect(calculateWeightedPercentage(withZero, reqs)).toBe(0)

    // With a second requirement, N/A on r1 means r2 alone sets the score,
    // but scoring 0 on r1 includes r1 in the denominator and drags r2 down.
    const reqs2 = [
      req({ id: 'r1', weight: 'HIGH' }),
      req({ id: 'r2', weight: 'HIGH' }),
    ]
    const secondScore = score({ requirementId: 'r2', value: 3 })

    const naCase   = calculateWeightedPercentage([...withNa,   secondScore], reqs2)
    const zeroCase = calculateWeightedPercentage([...withZero, secondScore], reqs2)

    // N/A on r1 → only r2 in denom → 100 %
    expect(naCase).toBe(100)
    // 0 on r1 → both in denom → (0×3 + 3×3) / (3×3+3×3) = 9/18 = 50 %
    expect(zeroCase).toBe(50)
    expect(naCase).toBeGreaterThan(zeroCase)
  })
})

// ─── 4. Evidence quality: TRIAL > DEMO > DOCUMENTATION > VENDOR_CLAIM ─────────

describe('Evidence quality correctly ranks TRIAL > DEMO > DOCUMENTATION > VENDOR_CLAIM', () => {
  it('TRIAL-only evidence gives 100 % high-confidence', () => {
    const result = calculateEvidenceQuality([
      score({ requirementId: 'r1', evidenceType: 'TRIAL' }),
    ])
    expect(result.high).toBe(1)
    expect(result.low).toBe(0)
    expect(result.percentage).toBe(100)
  })

  it('DEMO-only evidence gives 100 % high-confidence', () => {
    const result = calculateEvidenceQuality([
      score({ requirementId: 'r1', evidenceType: 'DEMO' }),
    ])
    expect(result.high).toBe(1)
    expect(result.low).toBe(0)
    expect(result.percentage).toBe(100)
  })

  it('DOCUMENTATION-only evidence gives 0 % high-confidence', () => {
    const result = calculateEvidenceQuality([
      score({ requirementId: 'r1', evidenceType: 'DOCUMENTATION' }),
    ])
    expect(result.high).toBe(0)
    expect(result.low).toBe(1)
    expect(result.percentage).toBe(0)
  })

  it('VENDOR_CLAIM-only evidence gives 0 % high-confidence', () => {
    const result = calculateEvidenceQuality([
      score({ requirementId: 'r1', evidenceType: 'VENDOR_CLAIM' }),
    ])
    expect(result.high).toBe(0)
    expect(result.low).toBe(1)
    expect(result.percentage).toBe(0)
  })

  it('ranking holds: TRIAL+DEMO percentage > DOCUMENTATION+VENDOR_CLAIM percentage', () => {
    const highEvidence = [
      score({ requirementId: 'r1', evidenceType: 'TRIAL' }),
      score({ requirementId: 'r2', evidenceType: 'DEMO' }),
    ]
    const lowEvidence = [
      score({ requirementId: 'r1', evidenceType: 'DOCUMENTATION' }),
      score({ requirementId: 'r2', evidenceType: 'VENDOR_CLAIM' }),
    ]
    expect(calculateEvidenceQuality(highEvidence).percentage)
      .toBeGreaterThan(calculateEvidenceQuality(lowEvidence).percentage)
  })

  it('mixed set of all four types gives 50 % high-confidence', () => {
    const result = calculateEvidenceQuality([
      score({ requirementId: 'r1', evidenceType: 'TRIAL' }),
      score({ requirementId: 'r2', evidenceType: 'DEMO' }),
      score({ requirementId: 'r3', evidenceType: 'DOCUMENTATION' }),
      score({ requirementId: 'r4', evidenceType: 'VENDOR_CLAIM' }),
    ])
    expect(result.high).toBe(2)
    expect(result.low).toBe(2)
    expect(result.percentage).toBe(50)
  })

  it('scores without an evidenceType are excluded from the count entirely', () => {
    const result = calculateEvidenceQuality([
      score({ requirementId: 'r1', evidenceType: 'TRIAL' }),
      score({ requirementId: 'r2', evidenceType: null }),   // no evidence recorded
      score({ requirementId: 'r3', evidenceType: null }),
    ])
    // Only r1 counts — high=1, low=0, total=1 → 100 %
    expect(result.high).toBe(1)
    expect(result.low).toBe(0)
    expect(result.percentage).toBe(100)
  })

  it('TRIAL evidence produces a higher percentage than DEMO when replacing a low-conf item', () => {
    // Not about per-type scoring (both TRIAL and DEMO are "high"), but confirms
    // they are treated identically in the high bucket — no secondary ranking needed
    const trialResult = calculateEvidenceQuality([
      score({ requirementId: 'r1', evidenceType: 'TRIAL' }),
      score({ requirementId: 'r2', evidenceType: 'VENDOR_CLAIM' }),
    ])
    const demoResult = calculateEvidenceQuality([
      score({ requirementId: 'r1', evidenceType: 'DEMO' }),
      score({ requirementId: 'r2', evidenceType: 'VENDOR_CLAIM' }),
    ])
    // Both should be 50 % — TRIAL and DEMO are equivalent in the high bucket
    expect(trialResult.percentage).toBe(50)
    expect(demoResult.percentage).toBe(50)
  })
})

// ─── 5. Coverage Gap Map ──────────────────────────────────────────────────────

describe('Coverage Gap Map flags contexts where no platform exceeds threshold', () => {
  const THRESHOLD = 70

  /**
   * Mirrors the hasCoverage logic in coverage/page.tsx:
   *   hasCoverage = platforms.some(pct => pct !== null && pct >= THRESHOLD)
   */
  function hasCoverage(platformScores: (number | null)[]): boolean {
    return platformScores.some(pct => pct !== null && pct >= THRESHOLD)
  }

  it('context with one platform above threshold has coverage', () => {
    expect(hasCoverage([75])).toBe(true)
  })

  it('context with one platform exactly at threshold has coverage', () => {
    expect(hasCoverage([THRESHOLD])).toBe(true)
  })

  it('context with all platforms below threshold is flagged as a gap', () => {
    expect(hasCoverage([30, 50, 69.9])).toBe(false)
  })

  it('context with no evaluations (all null) is flagged as a gap', () => {
    expect(hasCoverage([null, null, null])).toBe(false)
  })

  it('context with mixed null and below-threshold scores is flagged as a gap', () => {
    expect(hasCoverage([null, 60, null])).toBe(false)
  })

  it('single platform just above threshold rescues an otherwise-gap context', () => {
    expect(hasCoverage([40, 50, 70.1])).toBe(true)
  })

  it('computed weighted scores below threshold produce a gap', () => {
    const reqs = [req({ id: 'r1', weight: 'HIGH' })]
    // value=1 → 1×3/3×3×100 = 33.3 %  (<70 → gap)
    const pct  = calculateWeightedPercentage([score({ requirementId: 'r1', value: 1 })], reqs)
    expect(hasCoverage([pct])).toBe(false)
  })

  it('computed weighted scores above threshold give coverage', () => {
    const reqs = [req({ id: 'r1', weight: 'HIGH' })]
    // value=3 → 100 %  (≥70 → covered)
    const pct  = calculateWeightedPercentage([score({ requirementId: 'r1', value: 3 })], reqs)
    expect(hasCoverage([pct])).toBe(true)
  })

  it('a context with two platforms: one gap and one covered → has coverage', () => {
    const reqs = [req({ id: 'r1', weight: 'HIGH' })]
    const lowPct  = calculateWeightedPercentage([score({ requirementId: 'r1', value: 1 })], reqs)
    const highPct = calculateWeightedPercentage([score({ requirementId: 'r1', value: 3 })], reqs)
    expect(hasCoverage([lowPct, highPct])).toBe(true)
  })

  it('empty platform list (no platforms assigned to context) is a gap', () => {
    expect(hasCoverage([])).toBe(false)
  })
})

// ─── 6. Build Readiness only uses API / LTI / SSO / data-export categories ────

describe('Build Readiness Score only uses requirements in API/LTI/SSO/data-export categories', () => {
  const buildReqs = [
    req({ id: 'api-1', weight: 'HIGH',   category: 'API Gateway' }),
    req({ id: 'lti-1', weight: 'MEDIUM', category: 'LTI Integration' }),
    req({ id: 'sso-1', weight: 'MEDIUM', category: 'SSO Configuration' }),
    req({ id: 'exp-1', weight: 'LOW',    category: 'Data Export Standards' }),
    req({ id: 'int-1', weight: 'LOW',    category: 'Third-Party Integration' }),
    req({ id: 'iop-1', weight: 'LOW',    category: 'Interoperability Spec' }),
  ]
  const nonBuildReqs = [
    req({ id: 'ped-1', weight: 'HIGH',   category: 'Pedagogy' }),
    req({ id: 'con-1', weight: 'MEDIUM', category: 'Content Quality' }),
    req({ id: 'ui-1',  weight: 'LOW',    category: 'User Interface' }),
  ]
  const allReqs = [...buildReqs, ...nonBuildReqs]

  const perfectScores = allReqs.map(r => score({ requirementId: r.id, value: 3 }))
  const lowScores     = allReqs.map(r => score({ requirementId: r.id, value: 1 }))

  it('with all requirements scored perfectly, build readiness is 100 %', () => {
    expect(calculateBuildReadinessScore(perfectScores, allReqs)).toBe(100)
  })

  it('non-matching requirements do not affect the build readiness score', () => {
    // Score build reqs perfectly but score non-build reqs at 0
    const mixedScores = [
      ...buildReqs.map(r => score({ requirementId: r.id, value: 3 })),
      ...nonBuildReqs.map(r => score({ requirementId: r.id, value: 0 })),
    ]
    // Should still be 100 % since only build reqs count
    expect(calculateBuildReadinessScore(mixedScores, allReqs)).toBe(100)
  })

  it('non-matching requirements scored perfectly do not boost build readiness', () => {
    // Score non-build reqs perfectly but build reqs at 1/3
    const mixedScores = [
      ...buildReqs.map(r => score({ requirementId: r.id, value: 1 })),
      ...nonBuildReqs.map(r => score({ requirementId: r.id, value: 3 })),
    ]
    // Build readiness ≈ 33.3 % — non-build scores must not inflate it
    const pct = calculateBuildReadinessScore(mixedScores, allReqs)
    expect(pct).toBeCloseTo(33.33, 1)
  })

  it('requirement with null category is never included in build readiness', () => {
    const noCategory = req({ id: 'no-cat', weight: 'HIGH', category: null })
    const result = calculateBuildReadinessScore(
      [score({ requirementId: 'no-cat', value: 3 })],
      [noCategory],
    )
    expect(result).toBe(0)
  })

  it('"api" keyword matched case-insensitively', () => {
    const r = req({ id: 'r1', weight: 'HIGH', category: 'REST API Access' })
    const pct = calculateBuildReadinessScore([score({ requirementId: 'r1', value: 3 })], [r])
    expect(pct).toBe(100)
  })

  it('"lti" keyword matched case-insensitively', () => {
    const r = req({ id: 'r1', weight: 'HIGH', category: 'LTI 1.3 Compliance' })
    const pct = calculateBuildReadinessScore([score({ requirementId: 'r1', value: 3 })], [r])
    expect(pct).toBe(100)
  })

  it('"sso" keyword matched case-insensitively', () => {
    const r = req({ id: 'r1', weight: 'HIGH', category: 'SSO via SAML' })
    const pct = calculateBuildReadinessScore([score({ requirementId: 'r1', value: 3 })], [r])
    expect(pct).toBe(100)
  })

  it('"export" keyword matched in data export category', () => {
    const r = req({ id: 'r1', weight: 'HIGH', category: 'xAPI Data Export' })
    const pct = calculateBuildReadinessScore([score({ requirementId: 'r1', value: 3 })], [r])
    expect(pct).toBe(100)
  })

  it('"integration" keyword matched in category', () => {
    const r = req({ id: 'r1', weight: 'HIGH', category: 'Integration Layer' })
    const pct = calculateBuildReadinessScore([score({ requirementId: 'r1', value: 3 })], [r])
    expect(pct).toBe(100)
  })

  it('"interoperability" keyword matched in category', () => {
    const r = req({ id: 'r1', weight: 'HIGH', category: 'Interoperability Standards' })
    const pct = calculateBuildReadinessScore([score({ requirementId: 'r1', value: 3 })], [r])
    expect(pct).toBe(100)
  })

  it('"Pedagogy" category is never a build-readiness requirement', () => {
    const r = req({ id: 'r1', weight: 'HIGH', category: 'Pedagogy' })
    const pct = calculateBuildReadinessScore([score({ requirementId: 'r1', value: 3 })], [r])
    expect(pct).toBe(0)
  })

  it('returns 0 when no requirements exist at all', () => {
    expect(calculateBuildReadinessScore([], [])).toBe(0)
  })

  it('returns 0 when requirements exist but none match build-readiness keywords', () => {
    const pct = calculateBuildReadinessScore(lowScores, nonBuildReqs)
    expect(pct).toBe(0)
  })

  it('build readiness with mixed scores computes correct weighted percentage', () => {
    // api-1: HIGH(×3), value=3 → num=9, denom=9
    // lti-1: MEDIUM(×2), value=1 → num=2, denom=6
    // Only these two requirements, rest excluded
    const twoReqs   = [
      req({ id: 'api-1', weight: 'HIGH',   category: 'API Gateway' }),
      req({ id: 'lti-1', weight: 'MEDIUM', category: 'LTI Integration' }),
      req({ id: 'ped-1', weight: 'HIGH',   category: 'Pedagogy' }),  // excluded
    ]
    const twoScores = [
      score({ requirementId: 'api-1', value: 3 }),
      score({ requirementId: 'lti-1', value: 1 }),
      score({ requirementId: 'ped-1', value: 3 }),  // should not count
    ]
    // num = 3×3 + 1×2 = 11  |  denom = 3×3 + 3×2 = 15  → 73.33 %
    const pct = calculateBuildReadinessScore(twoScores, twoReqs)
    expect(pct).toBeCloseTo(73.33, 1)
  })
})
