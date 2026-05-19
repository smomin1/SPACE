import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { calculateWeightedPercentage, getRecommendedAction } from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'
import { EvaluationReportPDF } from '@/components/export/EvaluationReportPDF'
import type {
  ComparisonRow,
  CategoryBreakdownRow,
  BestFitData,
  BuildReadinessRow,
  MatrixData,
} from '@/components/export/EvaluationReportPDF'
import type { WeightLevel } from '@prisma/client'

// ─── Constants ─────────────────────────────────────────────────────────────────

const WEIGHT_MAP: Record<WeightLevel, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }
const MAX_SCORE              = 4
const SATISFACTION_THRESHOLD = 3    // ≥75% of MAX_SCORE
const MARGINAL_THRESHOLD     = 2.0
const MAX_SET_SIZE           = 5

const BUILD_READINESS_KEYWORDS = ['api', 'lti', 'export', 'sso', 'integration', 'interoperability']

const PLATFORM_PALETTE = [
  '#059669','#0284c7','#7c3aed','#dc2626','#d97706',
  '#0891b2','#be185d','#65a30d','#9333ea','#0f766e',
]

// ─── Converters ────────────────────────────────────────────────────────────────

function toReq(r: { id: string; weight: string; category: string | null; isComplianceGate: boolean }): Requirement {
  return { ...r, weight: r.weight as Requirement['weight'], contextIds: [] }
}

function toScore(s: { requirementId: string; value: number | null; evidenceType: string | null }): Score {
  return {
    requirementId: s.requirementId,
    value: s.value,
    evidenceType: s.evidenceType as Score['evidenceType'],
  }
}

// ─── Build per-platform avg score map ─────────────────────────────────────────

type EvalRow = {
  id: string
  platformId: string
  state: string
  scores: { requirementId: string; value: number | null; evidenceType: string | null }[]
}

function buildPlatformScores(
  platforms: { id: string; name: string; vendor: string }[],
  evalByPlatform: Map<string, EvalRow>,
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>()
  for (const p of platforms) {
    const ev = evalByPlatform.get(p.id)
    if (!ev) continue
    const sums = new Map<string, number[]>()
    for (const s of ev.scores) {
      if (s.value === null) continue
      const arr = sums.get(s.requirementId) ?? []
      arr.push(s.value)
      sums.set(s.requirementId, arr)
    }
    const avgMap = new Map<string, number>()
    for (const [rid, vals] of sums) {
      avgMap.set(rid, vals.reduce((a, b) => a + b, 0) / vals.length)
    }
    if (avgMap.size > 0) result.set(p.id, avgMap)
  }
  return result
}

// ─── Greedy set-cover ─────────────────────────────────────────────────────────

function greedySetCover(
  platforms: { id: string; name: string; vendor: string }[],
  requirements: { id: string; weight: WeightLevel }[],
  platformScores: Map<string, Map<string, number>>,
): {
  selectedIds: string[]
  bestPerReq: Map<string, { score: number; platformId: string }>
  marginalGains: Map<string, number>
} {
  const scoredReqIds = new Set<string>()
  for (const scores of platformScores.values()) {
    for (const rid of scores.keys()) scoredReqIds.add(rid)
  }
  const totalPossible = requirements
    .filter(r => scoredReqIds.has(r.id))
    .reduce((sum, r) => sum + MAX_SCORE * WEIGHT_MAP[r.weight], 0)

  const selectedIds: string[] = []
  const bestPerReq = new Map<string, { score: number; platformId: string }>()
  const marginalGains = new Map<string, number>()

  for (let i = 0; i < MAX_SET_SIZE; i++) {
    let bestGain = 0
    let bestId: string | null = null

    for (const p of platforms) {
      if (selectedIds.includes(p.id)) continue
      const scores = platformScores.get(p.id)
      if (!scores) continue
      let gain = 0
      for (const req of requirements) {
        const newScore    = scores.get(req.id) ?? 0
        const currentBest = bestPerReq.get(req.id)?.score ?? 0
        const improvement = Math.max(0, newScore - currentBest)
        gain += improvement * WEIGHT_MAP[req.weight]
      }
      if (gain > bestGain) { bestGain = gain; bestId = p.id }
    }

    if (!bestId) break
    const gainPct = totalPossible > 0 ? (bestGain / totalPossible) * 100 : 0
    if (i > 0 && gainPct < MARGINAL_THRESHOLD) break

    selectedIds.push(bestId)
    marginalGains.set(bestId, gainPct)

    const scores = platformScores.get(bestId)!
    for (const req of requirements) {
      const newScore = scores.get(req.id) ?? 0
      const current  = bestPerReq.get(req.id)
      if (newScore > 0 && (!current || newScore > current.score)) {
        bestPerReq.set(req.id, { score: newScore, platformId: bestId })
      }
    }
  }

  return { selectedIds, bestPerReq, marginalGains }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'view:results')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const [platforms, allRequirements, evaluations, contexts] = await Promise.all([
    prisma.platform.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, vendor: true, status: true },
    }),
    // All requirements including compliance
    prisma.requirement.findMany({
      select: {
        id: true,
        title: true,
        weight: true,
        category: true,
        isComplianceGate: true,
        evaluatorType: true,
      },
    }),
    prisma.evaluation.findMany({
      where: { state: { in: ['FINALISED', 'MERGED'] } },
      select: {
        id: true,
        platformId: true,
        state: true,
        scores: { select: { requirementId: true, value: true, evidenceType: true } },
      },
    }),
    prisma.context.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        requirements: { select: { requirementId: true } },
      },
    }),
  ])

  // Best evaluation per platform (prefer FINALISED)
  const evalByPlatform = new Map<string, EvalRow>()
  for (const ev of evaluations) {
    const cur = evalByPlatform.get(ev.platformId)
    if (!cur || (ev.state === 'FINALISED' && cur.state !== 'FINALISED')) {
      evalByPlatform.set(ev.platformId, ev)
    }
  }

  // Separate requirement groups
  const nonComplianceReqs = allRequirements.filter(r => r.evaluatorType !== 'COMPLIANCE')
  const complianceReqs    = allRequirements.filter(r => r.isComplianceGate)
  const pedagogyReqs      = nonComplianceReqs.filter(r => r.evaluatorType === 'PEDAGOGY').map(toReq)
  const technicalReqs     = nonComplianceReqs.filter(r => r.evaluatorType === 'TECHNICAL').map(toReq)
  const combinedReqs      = [...pedagogyReqs, ...technicalReqs]

  const activePlatforms = platforms.filter(p => p.status === 'ACTIVE')

  // ── Comparison ────────────────────────────────────────────────────────────

  const comparison: ComparisonRow[] = platforms.map(p => {
    const ev = evalByPlatform.get(p.id) ?? null
    if (!ev) {
      return {
        name: p.name, vendor: p.vendor, status: p.status,
        compliancePass: null, pedagogyPct: null, technicalPct: null, combinedPct: null,
        recommendation: null, evalState: null,
      }
    }
    const allScores = ev.scores.map(toScore)
    const cgPass = complianceReqs.length === 0
      ? null
      : !complianceReqs.some(r => allScores.some(s => s.requirementId === r.id && s.value === 0))

    const pPct = pedagogyReqs.length  ? calculateWeightedPercentage(allScores, pedagogyReqs)  : null
    const tPct = technicalReqs.length ? calculateWeightedPercentage(allScores, technicalReqs) : null
    const cPct = combinedReqs.length  ? calculateWeightedPercentage(allScores, combinedReqs)  : null

    const rec = p.status === 'DISQUALIFIED'
      ? 'DISQUALIFIED'
      : cPct !== null ? getRecommendedAction(cPct) : null

    return {
      name: p.name, vendor: p.vendor, status: p.status,
      compliancePass: cgPass,
      pedagogyPct: pPct, technicalPct: tPct, combinedPct: cPct,
      recommendation: rec, evalState: ev.state,
    }
  })

  // ── Category Breakdown ────────────────────────────────────────────────────

  const allCategories = [...new Set(nonComplianceReqs.map(r => r.category ?? 'General'))].sort()
  const activePlatformsWithData = activePlatforms.filter(p => evalByPlatform.has(p.id))

  const categoryBreakdown: CategoryBreakdownRow[] = allCategories.map(cat => {
    const catReqs = nonComplianceReqs.filter(r => (r.category ?? 'General') === cat).map(toReq)
    const platformPcts = activePlatformsWithData.map((p, idx) => {
      const ev = evalByPlatform.get(p.id)!
      const scores = ev.scores.map(toScore)
      const pct = catReqs.length ? calculateWeightedPercentage(scores, catReqs) : null
      return { platformId: p.id, name: p.name, pct, color: PLATFORM_PALETTE[idx % PLATFORM_PALETTE.length] }
    })
    return { category: cat, platforms: platformPcts }
  })

  // ── Best Fit (greedy set cover) ───────────────────────────────────────────

  const platformScores = buildPlatformScores(activePlatforms, evalByPlatform)
  const platformsWithData = activePlatforms.filter(p => platformScores.has(p.id))
  const platformById = new Map(activePlatforms.map(p => [p.id, p]))

  let bestFitData: BestFitData | null = null

  if (platformsWithData.length > 0 && combinedReqs.length > 0) {
    const { selectedIds, bestPerReq, marginalGains } = greedySetCover(
      platformsWithData, nonComplianceReqs, platformScores,
    )

    // Build members
    const members = selectedIds.map(pid => {
      const p = platformById.get(pid)!
      const scores = platformScores.get(pid) ?? new Map<string, number>()
      let num = 0, den = 0
      for (const req of nonComplianceReqs) {
        const s = scores.get(req.id)
        if (s === undefined) continue
        const m = WEIGHT_MAP[req.weight as WeightLevel]
        num += s * m
        den += MAX_SCORE * m
      }
      const overallPct = den > 0 ? (num / den) * 100 : null
      return {
        name: p.name, vendor: p.vendor,
        overallPct,
        marginalGainPct: marginalGains.get(pid) ?? 0,
      }
    })

    // Combined pct
    let cNum = 0, cDen = 0
    for (const req of nonComplianceReqs) {
      const best = bestPerReq.get(req.id)
      if (!best) continue
      const m = WEIGHT_MAP[req.weight as WeightLevel]
      cNum += best.score * m
      cDen += MAX_SCORE * m
    }
    const combinedPct = cDen > 0 ? (cNum / cDen) * 100 : 0

    // Satisfaction counts
    const scoredReqIds = new Set<string>()
    for (const scores of platformScores.values()) {
      for (const rid of scores.keys()) scoredReqIds.add(rid)
    }
    let satisfiedCount = 0
    let partialCount   = 0
    let uncoveredCount = 0
    for (const req of nonComplianceReqs) {
      const best = bestPerReq.get(req.id)
      const s    = best?.score ?? 0
      if (!scoredReqIds.has(req.id) || s === 0) { uncoveredCount++; continue }
      if (s >= SATISFACTION_THRESHOLD) satisfiedCount++
      else                              partialCount++
    }

    // Gaps — sorted HIGH first, then MEDIUM, then LOW
    const weightOrder: WeightLevel[] = ['HIGH', 'MEDIUM', 'LOW']
    const gaps: BestFitData['gaps'] = []
    for (const req of nonComplianceReqs) {
      const best     = bestPerReq.get(req.id)
      const setScore = best?.score ?? 0

      if (!scoredReqIds.has(req.id) || setScore === 0) {
        let allBest = 0
        for (const [, scores] of platformScores) {
          const s = scores.get(req.id)
          if (s !== undefined && s > allBest) allBest = s
        }
        gaps.push({
          title: req.title, category: req.category ?? 'General',
          weight: req.weight as WeightLevel, type: 'uncovered',
          bestAvailableScore: allBest || null,
        })
      } else if (setScore < SATISFACTION_THRESHOLD) {
        gaps.push({
          title: req.title, category: req.category ?? 'General',
          weight: req.weight as WeightLevel, type: 'weak',
          bestAvailableScore: setScore,
        })
      }
    }
    gaps.sort((a, b) => weightOrder.indexOf(a.weight) - weightOrder.indexOf(b.weight))

    bestFitData = {
      members,
      combinedPct,
      satisfiedCount,
      partialCount,
      uncoveredCount,
      totalCount: nonComplianceReqs.length,
      gaps,
    }
  }

  // ── Build Readiness ───────────────────────────────────────────────────────

  const buildReadinessRows: BuildReadinessRow[] = activePlatformsWithData.map(p => {
    const ev = evalByPlatform.get(p.id)!
    const scores = ev.scores.map(toScore)

    // Overall (non-compliance)
    const overallPct = combinedReqs.length
      ? calculateWeightedPercentage(scores, combinedReqs)
      : null

    // Per keyword group
    const keywordGroups = BUILD_READINESS_KEYWORDS.map(kw => {
      const kwReqs = nonComplianceReqs
        .filter(r => r.category !== null && r.category.toLowerCase().includes(kw))
        .map(toReq)
      const pct = kwReqs.length ? calculateWeightedPercentage(scores, kwReqs) : null
      return { keyword: kw, pct }
    })

    return { name: p.name, vendor: p.vendor, overallPct, keywordGroups }
  })

  // ── Full Requirements Matrix ───────────────────────────────────────────────

  // Group all requirements by category
  const matrixCategories = [...new Set(allRequirements.map(r => r.category ?? 'General'))].sort()
  const platformsForMatrix = platforms.filter(p => evalByPlatform.has(p.id))

  // Per-platform avg scores for ALL requirements (including compliance)
  const allPlatformScores = buildPlatformScores(
    platformsForMatrix,
    evalByPlatform,
  )

  // Build matrix rows
  const matrixRows: MatrixData['rows'] = allRequirements.map(req => {
    const platformScoresForReq: (number | null)[] = platformsForMatrix.map(p => {
      const scores = allPlatformScores.get(p.id)
      if (!scores) return null
      const s = scores.get(req.id)
      return s !== undefined ? s : null
    })
    return {
      id: req.id,
      title: req.title,
      category: req.category ?? 'General',
      weight: req.weight as WeightLevel,
      evaluatorType: req.evaluatorType,
      scores: platformScoresForReq,
    }
  })

  const matrixData: MatrixData = {
    platforms: platformsForMatrix.map(p => ({ id: p.id, name: p.name, vendor: p.vendor })),
    categories: matrixCategories,
    rows: matrixRows,
  }

  // ── Render PDF ────────────────────────────────────────────────────────────

  const element = createElement(EvaluationReportPDF, {
    generatedAt: new Date().toLocaleDateString(undefined, { dateStyle: 'long' }),
    comparison,
    categoryBreakdown,
    bestFitData,
    buildReadiness: buildReadinessRows,
    matrixData,
  }) as unknown as ReactElement<DocumentProps>

  const buffer = await renderToBuffer(element)
  const body = new Uint8Array(buffer)

  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="evaluation-report.pdf"',
    },
  })
}
