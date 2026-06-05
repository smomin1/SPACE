import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getRecommendedAction } from '@/lib/scoring'
import type { Score } from '@/lib/scoring'
import type { WeightLevel } from '@prisma/client'
import {
  getLinkedVitalProfiles,
  parseVitalFilterFromSearchParams,
  matchesVitalFilter,
} from '@/lib/vital/profile'
import { FullscreenWrapper } from '@/components/ui/fullscreen-wrapper'

// ─── Constants ────────────────────────────────────────────────────────────────

const WEIGHT_MAP: Record<WeightLevel, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }
const MAX_SCORE              = 4    // denominator for regular requirements
const SATISFACTION_THRESHOLD = MAX_SCORE * 0.75  // = 3: requirement is "satisfied" at ≥75% of max

// Compliance gates are binary (0 = No, 1 = Yes); max is 1, satisfied when score ≥ 1
function maxScoreFor(req: { isComplianceGate: boolean }): number {
  return req.isComplianceGate ? 1 : MAX_SCORE
}
function satisfactionThresholdFor(req: { isComplianceGate: boolean }): number {
  return req.isComplianceGate ? 1 : SATISFACTION_THRESHOLD
}
const MAX_SET_SIZE           = 5    // cap on combination size
const GAP_CATEGORY_THRESHOLD = 75   // below this % in category = gap (matches 75% satisfaction rule)

// ─── Score helpers ────────────────────────────────────────────────────────────

function toScore(s: { requirementId: string; value: number | null; evidenceType: string | null }): Score {
  return {
    requirementId: s.requirementId,
    value: s.value,
    evidenceType: s.evidenceType as Score['evidenceType'],
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type RawReq = {
  id: string
  title: string
  weight: WeightLevel
  category: string | null
  isComplianceGate: boolean
}

type PlatformRow = { id: string; name: string; vendor: string }

type EvalRow = {
  id: string
  platformId: string
  state: string
  scores: { requirementId: string; value: number | null; evidenceType: string | null }[]
}

type SetMember = {
  id: string; name: string; vendor: string
  overallPct: number | null
  marginalGainPct: number
  topCategories: { category: string; pct: number }[]
}

type GapItem = {
  id: string; title: string; category: string; weight: WeightLevel
  isComplianceGate: boolean
  type: 'uncovered' | 'weak'
  bestScore: number | null
  bestPlatformName: string | null
  helperPlatforms: { name: string; score: number }[]  // other platforms that score better
}

type CombinedAnalysis = {
  members: SetMember[]
  combinedPct: number
  satisfiedCount: number    // reqs where best set score ≥ SATISFACTION_THRESHOLD (75%)
  partialCount: number      // reqs where 0 < best set score < SATISFACTION_THRESHOLD
  uncoveredCount: number    // reqs with no score from any platform
  totalCount: number        // all reqs
  gaps: GapItem[]
  gapByCategory: { category: string; total: number; uncovered: number; weak: number }[]
  categorySatisfaction: {
    category: string
    total: number
    satisfied: number
    partial: number
    uncovered: number
  }[]
}

type PlatformProfile = {
  id: string; name: string; vendor: string
  overallPct: number
  categoryBreakdown: { category: string; pct: number }[]
  gapSuggestions: {
    category: string
    platformPct: number
    alternatives: { id: string; name: string; vendor: string; pct: number }[]
  }[]
}

// ─── Algorithm: build per-platform effective score map ────────────────────────

function buildPlatformScores(
  platforms: PlatformRow[],
  evalByPlatform: Map<string, EvalRow>,
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>()
  for (const p of platforms) {
    const ev = evalByPlatform.get(p.id)
    if (!ev) continue
    const scores = ev.scores.map(toScore)
    const sums = new Map<string, number[]>()
    for (const s of scores) {
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

// ─── Algorithm: greedy set cover ──────────────────────────────────────────────

function greedySetCover(
  platforms: PlatformRow[],
  requirements: RawReq[],
  platformScores: Map<string, Map<string, number>>,
): {
  selectedIds: string[]
  bestPerReq: Map<string, { score: number; platformId: string }>
  marginalGains: Map<string, number>
} {
  // Requirement IDs that any platform has scored (non-null)
  const scoredReqIds = new Set<string>()
  for (const scores of platformScores.values()) {
    for (const rid of scores.keys()) scoredReqIds.add(rid)
  }
  // Total weight of all scorable requirements, used to express each pick's
  // marginal contribution as a % of requirement coverage.
  const totalReqWeight = requirements
    .filter(r => scoredReqIds.has(r.id))
    .reduce((sum, r) => sum + WEIGHT_MAP[r.weight], 0)

  const selectedIds: string[] = []
  const bestPerReq = new Map<string, { score: number; platformId: string }>()
  const marginalGains = new Map<string, number>()

  // Greedy set cover: at each step add the platform that *newly satisfies* the
  // most (weight-prioritised) requirements. A requirement is satisfied once its
  // best score reaches SATISFACTION_THRESHOLD. This maximises requirement
  // coverage with the fewest platforms. Ties (and the first pick when nothing
  // yet clears the bar) fall back to raw weighted-score improvement.
  for (let i = 0; i < MAX_SET_SIZE; i++) {
    let bestId: string | null = null
    let bestWeightedNew = 0   // weighted count of newly-satisfied requirements
    let bestScoreGain = 0     // tiebreak / fallback: weighted score improvement

    for (const p of platforms) {
      if (selectedIds.includes(p.id)) continue
      const scores = platformScores.get(p.id)
      if (!scores) continue

      let weightedNew = 0
      let scoreGain = 0
      for (const req of requirements) {
        const newScore    = scores.get(req.id) ?? 0
        const currentBest = bestPerReq.get(req.id)?.score ?? 0
        if (newScore > currentBest) {
          scoreGain += (newScore - currentBest) * WEIGHT_MAP[req.weight]
        }
        if (currentBest < SATISFACTION_THRESHOLD && newScore >= SATISFACTION_THRESHOLD) {
          weightedNew += WEIGHT_MAP[req.weight]
        }
      }

      if (
        weightedNew > bestWeightedNew ||
        (weightedNew === bestWeightedNew && scoreGain > bestScoreGain)
      ) {
        bestWeightedNew = weightedNew
        bestScoreGain = scoreGain
        bestId = p.id
      }
    }

    if (!bestId) break
    // Stop once an extra platform satisfies no further requirements (the first
    // pick always seeds the set, even if nothing clears the satisfaction bar).
    if (i > 0 && bestWeightedNew === 0) break

    selectedIds.push(bestId)
    marginalGains.set(bestId, totalReqWeight > 0 ? (bestWeightedNew / totalReqWeight) * 100 : 0)

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

// ─── Algorithm: compute combined coverage and gaps ────────────────────────────

function buildCombinedAnalysis(
  selectedIds: string[],
  bestPerReq: Map<string, { score: number; platformId: string }>,
  marginalGains: Map<string, number>,
  platforms: PlatformRow[],
  requirements: RawReq[],
  platformScores: Map<string, Map<string, number>>,
): CombinedAnalysis {
  const platformById = new Map(platforms.map(p => [p.id, p]))

  // Build SetMembers
  const members: SetMember[] = selectedIds.map(pid => {
    const p = platformById.get(pid)!
    const scores = platformScores.get(pid) ?? new Map<string, number>()

    // Overall pct for this platform individually
    let num = 0, den = 0
    for (const req of requirements) {
      const s = scores.get(req.id)
      if (s === undefined) continue
      const m = WEIGHT_MAP[req.weight]
      num += s * m
      den += maxScoreFor(req) * m
    }
    const overallPct = den > 0 ? (num / den) * 100 : null

    // Categories where this platform contributes the best score in the set
    const catScores = new Map<string, { sum: number; den: number }>()
    for (const req of requirements) {
      const best = bestPerReq.get(req.id)
      if (!best || best.platformId !== pid) continue
      const cat   = req.category ?? 'General'
      const m     = WEIGHT_MAP[req.weight]
      const entry = catScores.get(cat) ?? { sum: 0, den: 0 }
      entry.sum += best.score * m
      entry.den += maxScoreFor(req) * m
      catScores.set(cat, entry)
    }
    const topCategories = [...catScores.entries()]
      .map(([category, v]) => ({ category, pct: (v.sum / v.den) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)

    return {
      id: pid, name: p.name, vendor: p.vendor,
      overallPct,
      marginalGainPct: marginalGains.get(pid) ?? 0,
      topCategories,
    }
  })

  // Combined weighted pct using best score per req
  let num = 0, den = 0
  for (const req of requirements) {
    const best = bestPerReq.get(req.id)
    if (!best) continue
    const m = WEIGHT_MAP[req.weight]
    num += best.score * m
    den += maxScoreFor(req) * m
  }
  const combinedPct = den > 0 ? (num / den) * 100 : 0

  // All req IDs that any platform has scored (non-null)
  const scoredReqIds = new Set<string>()
  for (const scores of platformScores.values()) {
    for (const rid of scores.keys()) scoredReqIds.add(rid)
  }

  // Satisfaction counts: a req is "satisfied" if best set score >= threshold
  // Compliance gates: satisfied at score ≥ 1 (Yes). Regular: satisfied at ≥ 75% of 4.
  let satisfiedCount = 0
  let partialCount   = 0
  let uncoveredCount = 0
  for (const req of requirements) {
    const best = bestPerReq.get(req.id)
    const s    = best?.score ?? 0
    if (!scoredReqIds.has(req.id) || s === 0) { uncoveredCount++; continue }
    if (s >= satisfactionThresholdFor(req)) satisfiedCount++
    else                                    partialCount++
  }

  // Gap analysis: gaps are reqs not yet satisfied (< SATISFACTION_THRESHOLD)
  const gaps: GapItem[] = []
  for (const req of requirements) {
    const best     = bestPerReq.get(req.id)
    const setScore = best?.score ?? 0

    if (!scoredReqIds.has(req.id) || setScore === 0) {
      // Unevaluated or scored 0 (FAIL) by everyone in the set
      const helperPlatforms = [...platformScores.entries()]
        .filter(([pid]) => !selectedIds.includes(pid))
        .map(([pid, scores]) => {
          const s = scores.get(req.id)
          return s && s > 0 ? { name: platformById.get(pid)?.name ?? pid, score: s } : null
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)

      // Best score across ALL platforms (outside set)
      let allBest = 0, allBestPlatId: string | null = null
      for (const [pid, scores] of platformScores) {
        const s = scores.get(req.id)
        if (s !== undefined && s > allBest) { allBest = s; allBestPlatId = pid }
      }

      gaps.push({
        id: req.id, title: req.title,
        category: req.category ?? 'General',
        weight: req.weight, isComplianceGate: req.isComplianceGate, type: 'uncovered',
        bestScore: allBest || null,
        bestPlatformName: allBestPlatId ? (platformById.get(allBestPlatId)?.name ?? null) : null,
        helperPlatforms,
      })
      continue
    }

    if (setScore < satisfactionThresholdFor(req)) {
      // Scored but below the satisfaction bar
      const helperPlatforms = [...platformScores.entries()]
        .filter(([pid]) => !selectedIds.includes(pid))
        .map(([pid, scores]) => {
          const s = scores.get(req.id)
          return s && s > setScore ? { name: platformById.get(pid)?.name ?? pid, score: s } : null
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)

      gaps.push({
        id: req.id, title: req.title,
        category: req.category ?? 'General',
        weight: req.weight, isComplianceGate: req.isComplianceGate, type: 'weak',
        bestScore: setScore,
        bestPlatformName: best ? (platformById.get(best.platformId)?.name ?? null) : null,
        helperPlatforms,
      })
    }
  }

  // Gap summary by category
  const catGapMap = new Map<string, { total: number; uncovered: number; weak: number }>()
  for (const req of requirements) {
    const cat   = req.category ?? 'General'
    const entry = catGapMap.get(cat) ?? { total: 0, uncovered: 0, weak: 0 }
    entry.total++
    const gap = gaps.find(g => g.id === req.id)
    if (gap?.type === 'uncovered') entry.uncovered++
    else if (gap?.type === 'weak') entry.weak++
    catGapMap.set(cat, entry)
  }
  const gapByCategory = [...catGapMap.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .filter(c => c.uncovered + c.weak > 0)
    .sort((a, b) => (b.uncovered + b.weak) - (a.uncovered + a.weak))

  // Per-category satisfaction breakdown
  const catSatMap = new Map<string, { total: number; satisfied: number; partial: number; uncovered: number }>()
  for (const req of requirements) {
    const cat   = req.category ?? 'General'
    const entry = catSatMap.get(cat) ?? { total: 0, satisfied: 0, partial: 0, uncovered: 0 }
    entry.total++
    const best = bestPerReq.get(req.id)
    const s    = best?.score ?? 0
    if (!scoredReqIds.has(req.id) || s === 0)        entry.uncovered++
    else if (s >= satisfactionThresholdFor(req))     entry.satisfied++
    else                                             entry.partial++
    catSatMap.set(cat, entry)
  }
  const categorySatisfaction = [...catSatMap.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => a.category.localeCompare(b.category))

  return {
    members,
    combinedPct,
    satisfiedCount,
    partialCount,
    uncoveredCount,
    totalCount: requirements.length,
    gaps,
    gapByCategory,
    categorySatisfaction,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BestFitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'view:results')) redirect('/dashboard')

  const sp              = await searchParams
  const contextIds      = (typeof sp.context        === 'string' ? sp.context        : '').split(',').filter(Boolean)
  const platformIds     = (typeof sp.platform       === 'string' ? sp.platform       : '').split(',').filter(Boolean)
  const categoryFilters = (typeof sp.category       === 'string' ? sp.category       : '').split(',').filter(Boolean)
  const evalTypeFilter  = typeof sp.evaluatorType  === 'string' ? sp.evaluatorType  : null
  const statuses        = (typeof sp.status === 'string' ? sp.status : 'FINALISED').split(',').filter(Boolean)
  const vitalFilter     = parseVitalFilterFromSearchParams(sp)

  const isSinglePlatform = platformIds.length === 1
  const isContextMode    = !isSinglePlatform && contextIds.length > 0

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const [contexts, allActivePlatformsRaw, allRequirements, evaluations] = await Promise.all([
    // Only fetch contexts when context filter is active; overview mode doesn't use them
    isContextMode
      ? prisma.context.findMany({
          where: { id: { in: contextIds } },
          orderBy: { name: 'asc' },
          select: {
            id: true, name: true, description: true,
            requirements: { select: { requirementId: true } },
          },
        })
      : Promise.resolve([]),

    // Always exclude DISQUALIFIED platforms
    prisma.platform.findMany({
      where: {
        status: 'ACTIVE',
        track: { not: 'VITAL' },
        ...(isSinglePlatform && { id: { in: platformIds } }),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, vendor: true },
    }),

    prisma.requirement.findMany({
      where: {
        ...(categoryFilters.length > 0 && { category: { in: categoryFilters } }),
        ...(evalTypeFilter             && { evaluatorType: evalTypeFilter as 'PEDAGOGY' | 'TECHNICAL' | 'BOTH' }),
      },
      select: { id: true, title: true, weight: true, category: true, isComplianceGate: true },
    }),

    prisma.evaluation.findMany({
      where: { state: { in: statuses as ('FINALISED' | 'MERGED' | 'IN_PROGRESS')[] } },
      select: {
        id: true, platformId: true, state: true,
        scores: { select: { requirementId: true, value: true, evidenceType: true } },
      },
    }),
  ])

  // Optional VITAL filter (narrows the platform pool to linked matches).
  const vitalProfiles = vitalFilter
    ? await getLinkedVitalProfiles(allActivePlatformsRaw.map(p => p.id))
    : null
  const allActivePlatforms = vitalFilter
    ? allActivePlatformsRaw.filter(p => matchesVitalFilter(vitalProfiles!.get(p.id), vitalFilter))
    : allActivePlatformsRaw

  // Best evaluation per platform (prefer FINALISED)
  const evalByPlatform = new Map<string, EvalRow>()
  for (const ev of evaluations) {
    const cur = evalByPlatform.get(ev.platformId)
    if (!cur || (ev.state === 'FINALISED' && cur.state !== 'FINALISED')) {
      evalByPlatform.set(ev.platformId, ev)
    }
  }

  const allCategories = [...new Set(allRequirements.map(r => r.category ?? 'General'))].sort()

  // ── Single-platform mode ──────────────────────────────────────────────────

  if (isSinglePlatform) {
    const p = allActivePlatforms[0]
    if (!p) {
      return <EmptyState message="Platform not found or disqualified" hint="Only active platforms can appear in Best Fit." />
    }

    const ev = evalByPlatform.get(p.id)
    if (!ev) {
      return <EmptyState message="No evaluation data" hint="This platform has no scored evaluation yet." />
    }

    const scores = ev.scores.map(toScore)

    // Per-category breakdown
    const categoryBreakdown = allCategories.map(cat => {
      const catReqs = allRequirements.filter(r => (r.category ?? 'General') === cat)
      if (!catReqs.length) return null
      let num = 0, den = 0
      const sums = new Map<string, number[]>()
      for (const s of scores) {
        if (s.value === null) continue
        const arr = sums.get(s.requirementId) ?? []
        arr.push(s.value)
        sums.set(s.requirementId, arr)
      }
      for (const req of catReqs) {
        const vals = sums.get(req.id)
        if (!vals) continue
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length
        const m   = WEIGHT_MAP[req.weight]
        num += avg * m
        den += MAX_SCORE * m
      }
      const pct = den > 0 ? (num / den) * 100 : 0
      return { category: cat, pct }
    }).filter((c): c is NonNullable<typeof c> => c !== null)

    let totalNum = 0, totalDen = 0
    const allSums = new Map<string, number[]>()
    for (const s of scores) {
      if (s.value === null) continue
      const arr = allSums.get(s.requirementId) ?? []
      arr.push(s.value)
      allSums.set(s.requirementId, arr)
    }
    for (const req of allRequirements) {
      const vals = allSums.get(req.id)
      if (!vals) continue
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      const m   = WEIGHT_MAP[req.weight]
      totalNum += avg * m
      totalDen += MAX_SCORE * m
    }
    const overallPct = totalDen > 0 ? (totalNum / totalDen) * 100 : 0

    // Gap categories and suggestions (only ACTIVE alternatives)
    const otherPlatforms = allActivePlatforms.filter(op => op.id !== p.id && evalByPlatform.has(op.id))
    const gapCats = categoryBreakdown.filter(c => c.pct < GAP_CATEGORY_THRESHOLD)
    const gapSuggestions = gapCats.map(gap => {
      const catReqs = allRequirements.filter(r => (r.category ?? 'General') === gap.category)
      const alternatives = otherPlatforms.map(op => {
        const oev = evalByPlatform.get(op.id)!
        const oscores = oev.scores.map(toScore)
        const osums = new Map<string, number[]>()
        for (const s of oscores) {
          if (s.value === null) continue
          const arr = osums.get(s.requirementId) ?? []
          arr.push(s.value)
          osums.set(s.requirementId, arr)
        }
        let onum = 0, oden = 0
        for (const req of catReqs) {
          const vals = osums.get(req.id)
          if (!vals) continue
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length
          const m   = WEIGHT_MAP[req.weight]
          onum += avg * m
          oden += MAX_SCORE * m
        }
        const pct = oden > 0 ? (onum / oden) * 100 : 0
        return pct > 0 ? { id: op.id, name: op.name, vendor: op.vendor, pct } : null
      }).filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 2)

      return { category: gap.category, platformPct: gap.pct, alternatives }
    })

    const profile: PlatformProfile = {
      id: p.id, name: p.name, vendor: p.vendor,
      overallPct,
      categoryBreakdown: categoryBreakdown.sort((a, b) => a.category.localeCompare(b.category)),
      gapSuggestions,
    }

    return (
      <FullscreenWrapper title="Best Fit">
        <PlatformProfileView profile={profile} />
      </FullscreenWrapper>
    )
  }

  // ── Context mode & Overview mode ──────────────────────────────────────────

  if (isContextMode) {
    // One analysis card per selected context.
    // Context = a requirement subset; ALL active platforms are scored against it.
    const contextAnalyses = contexts.map(ctx => {
      const ctxReqIds = new Set(ctx.requirements.map(r => r.requirementId))
      const ctxReqs   = allRequirements.filter(r => ctxReqIds.has(r.id))

      if (!ctxReqs.length) return { ctx, analysis: null }

      const scores           = buildPlatformScores(allActivePlatforms, evalByPlatform)
      const platformsWithData = allActivePlatforms.filter(p => scores.has(p.id))

      if (!platformsWithData.length) return { ctx, analysis: null }

      const { selectedIds, bestPerReq, marginalGains } = greedySetCover(platformsWithData, ctxReqs, scores)
      const analysis = buildCombinedAnalysis(
        selectedIds, bestPerReq, marginalGains, platformsWithData, ctxReqs, scores,
      )
      return { ctx, analysis }
    })

    const hasAny = contextAnalyses.some(c => c.analysis !== null)
    if (!hasAny) {
      return <EmptyState message="No scored platforms in the selected context(s)" hint="Platforms must be assigned to a context and have a finalised evaluation." />
    }

    return (
      <FullscreenWrapper title="Best Fit">
        <div className="space-y-12">
          {contextAnalyses.map(({ ctx, analysis }) =>
            analysis ? (
              <section key={ctx.id} className="space-y-6">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-base font-semibold text-emerald-950">{ctx.name}</h2>
                  {ctx.description && (
                    <span className="text-xs text-stone-400 truncate max-w-xs">{ctx.description}</span>
                  )}
                </div>
                <CombinedSetSection analysis={analysis} />
                <GapAnalysisSection analysis={analysis} />
                <RequirementSatisfactionSection analysis={analysis} />
              </section>
            ) : (
              <section key={ctx.id} className="space-y-2">
                <h2 className="text-base font-semibold text-emerald-950">{ctx.name}</h2>
                <p className="text-sm text-stone-400">No platforms with evaluations in this context.</p>
              </section>
            )
          )}
        </div>
      </FullscreenWrapper>
    )
  }

  // Overview: all active platforms × all requirements
  if (!allActivePlatforms.length || !allRequirements.length) {
    return <EmptyState message="No data available" hint="Add platforms and requirements, then complete evaluations." />
  }

  const overviewScores = buildPlatformScores(allActivePlatforms, evalByPlatform)
  const platformsWithData = allActivePlatforms.filter(p => overviewScores.has(p.id))

  if (!platformsWithData.length) {
    return (
      <EmptyState
        message="No finalised evaluations yet"
        hint="Platforms need a finalised evaluation before they appear here."
      />
    )
  }

  const { selectedIds, bestPerReq, marginalGains } = greedySetCover(
    platformsWithData, allRequirements, overviewScores,
  )
  const analysis = buildCombinedAnalysis(
    selectedIds, bestPerReq, marginalGains,
    platformsWithData, allRequirements, overviewScores,
  )

  return (
    <FullscreenWrapper title="Best Fit">
      <div className="space-y-10">
        <CombinedSetSection analysis={analysis} />
        <GapAnalysisSection analysis={analysis} />
        <RequirementSatisfactionSection analysis={analysis} />
      </div>
    </FullscreenWrapper>
  )
}

// ─── Combined Set Section ──────────────────────────────────────────────────────

function CombinedSetSection({ analysis: a }: { analysis: CombinedAnalysis }) {
  const satisfactionPct = a.totalCount > 0
    ? Math.round((a.satisfiedCount / a.totalCount) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-emerald-950">Recommended Combination</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Minimum set that best covers all requirements. A requirement is satisfied at 75% score or above.
          </p>
        </div>
        {/* Combined stats */}
        <div className="flex items-center gap-6 shrink-0 text-right">
          <div>
            <p className="text-2xl font-bold tabular-nums text-emerald-800">
              {a.combinedPct.toFixed(1)}%
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">combined score</p>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums text-stone-700">
              {a.satisfiedCount}
              <span className="text-sm font-normal text-stone-400"> / {a.totalCount}</span>
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">requirements satisfied</p>
          </div>
          <div>
            <p className={`text-xl font-bold tabular-nums ${satisfactionPct >= 80 ? 'text-emerald-700' : satisfactionPct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {satisfactionPct}%
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">satisfaction rate</p>
          </div>
        </div>
      </div>

      {/* Combined score bar */}
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${Math.min(100, a.combinedPct)}%` }}
        />
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {a.members.map((m, i) => (
          <SetMemberCard key={m.id} member={m} rank={i + 1} isPrimary={i === 0} />
        ))}
      </div>
    </div>
  )
}

function SetMemberCard({
  member: m,
  rank,
  isPrimary,
}: {
  member: SetMember
  rank: number
  isPrimary: boolean
}) {
  const tier      = m.overallPct !== null ? getRecommendedAction(m.overallPct) : null
  const tierLabel = tier?.replace(/_/g, ' ') ?? null

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${
      isPrimary
        ? 'border-emerald-200/70 bg-emerald-50/40'
        : 'border-stone-200/80 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white ${
              isPrimary ? 'bg-emerald-600' : 'bg-stone-500'
            }`}>
              {isPrimary ? 'Primary' : `+${m.marginalGainPct.toFixed(1)}% coverage`}
            </span>
            <span className="text-[11px] text-stone-400 tabular-nums">#{rank}</span>
          </div>
          <h3 className="font-bold text-emerald-950 truncate">{m.name}</h3>
          <p className="text-sm text-stone-500 truncate">{m.vendor}</p>
        </div>
        <div className="text-right shrink-0">
          {m.overallPct !== null && (
            <>
              <p className={`text-xl font-bold tabular-nums ${scoreColor(m.overallPct)}`}>
                {m.overallPct.toFixed(1)}%
              </p>
              {tierLabel && (
                <span className={`inline-flex mt-1 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${tierColor(tier!)}`}>
                  {tierLabel}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {m.overallPct !== null && (
        <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${isPrimary ? 'bg-emerald-600' : 'bg-stone-400'}`}
            style={{ width: `${Math.min(100, m.overallPct)}%` }}
          />
        </div>
      )}

      {m.topCategories.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
            Best contributor in
          </p>
          <ul className="space-y-1">
            {m.topCategories.map(c => (
              <li key={c.category} className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-stone-600 truncate">{c.category}</span>
                <span className="text-[11px] tabular-nums text-emerald-700 font-medium shrink-0">
                  {c.pct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Gap Analysis Section ──────────────────────────────────────────────────────

function GapAnalysisSection({ analysis: a }: { analysis: CombinedAnalysis }) {
  if (a.gaps.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-5 text-center">
        <p className="text-sm font-medium text-emerald-800">Full coverage achieved</p>
        <p className="text-xs text-stone-400 mt-1">
          The recommended combination covers all evaluated requirements adequately.
        </p>
      </div>
    )
  }

  const uncovered = a.gaps.filter(g => g.type === 'uncovered')
  const weak      = a.gaps.filter(g => g.type === 'weak')

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-base font-semibold text-emerald-950">Coverage Gaps</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Requirements not well covered even with the optimal combination
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-right">
          {uncovered.length > 0 && (
            <div>
              <p className="text-lg font-bold tabular-nums text-red-600">{uncovered.length}</p>
              <p className="text-[10px] text-stone-400">unevaluated</p>
            </div>
          )}
          {weak.length > 0 && (
            <div>
              <p className="text-lg font-bold tabular-nums text-amber-600">{weak.length}</p>
              <p className="text-[10px] text-stone-400">weak coverage</p>
            </div>
          )}
        </div>
      </div>

      {/* Gap by category summary */}
      {a.gapByCategory.length > 0 && (
        <div className="rounded-xl border border-stone-200/80 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 bg-stone-50/60">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Gaps by Category
            </p>
          </div>
          <div className="divide-y divide-stone-100">
            {a.gapByCategory.map(cat => {
              const gapCount = cat.uncovered + cat.weak
              const gapPct   = cat.total > 0 ? (gapCount / cat.total) * 100 : 0
              return (
                <div key={cat.category} className="flex items-center gap-4 px-5 py-3">
                  <p className="flex-1 text-sm text-stone-700 truncate">{cat.category}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-24 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${gapPct > 50 ? 'bg-red-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, gapPct)}%` }}
                      />
                    </div>
                    <span className={`text-[11.5px] tabular-nums font-medium w-16 text-right ${gapPct > 50 ? 'text-red-600' : 'text-amber-600'}`}>
                      {gapCount}/{cat.total} reqs
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-36 justify-end">
                    {cat.uncovered > 0 && (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-200/60">
                        {cat.uncovered} unevaluated
                      </span>
                    )}
                    {cat.weak > 0 && (
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200/60">
                        {cat.weak} weak
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unevaluated requirements */}
      {uncovered.length > 0 && (
        <GapGroup
          title="Unevaluated Requirements"
          subtitle="No platform has scored these yet. Data is needed before procurement decisions can be made."
          items={uncovered}
          color="red"
        />
      )}

      {/* Weakly covered requirements */}
      {weak.length > 0 && (
        <GapGroup
          title="Weakly Covered Requirements"
          subtitle="These are scored but the best available score is low. Consider additional vendor trials or demos."
          items={weak}
          color="amber"
        />
      )}
    </div>
  )
}

function GapGroup({
  title,
  subtitle,
  items,
  color,
}: {
  title: string
  subtitle: string
  items: GapItem[]
  color: 'red' | 'amber'
}) {
  const borderCls = color === 'red'
    ? 'border-red-200/70'
    : 'border-amber-200/70'
  const headerBg  = color === 'red'
    ? 'bg-red-50/60 border-red-100'
    : 'bg-amber-50/60 border-amber-100'
  const dotCls = color === 'red' ? 'bg-red-500' : 'bg-amber-500'

  return (
    <div className={`rounded-xl border overflow-hidden ${borderCls}`}>
      <div className={`px-5 py-3 border-b ${headerBg}`}>
        <p className="text-[12.5px] font-semibold text-stone-700">{title}</p>
        <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="divide-y divide-stone-100 bg-white">
        {items.map(item => (
          <div key={item.id} className="px-5 py-3.5 space-y-1.5">
            <div className="flex items-start gap-3">
              <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dotCls}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13px] font-medium text-stone-800">{item.title}</p>
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0 text-[10px] font-semibold ring-1 ring-inset ${
                    item.weight === 'HIGH'
                      ? 'bg-red-50 text-red-700 ring-red-200/60'
                      : item.weight === 'MEDIUM'
                      ? 'bg-amber-50 text-amber-700 ring-amber-200/60'
                      : 'bg-stone-50 text-stone-600 ring-stone-200/60'
                  }`}>
                    {item.weight}
                  </span>
                  <span className="text-[11px] text-stone-400">{item.category}</span>
                </div>

                {item.bestScore !== null && item.bestPlatformName && (
                  <p className="text-[11.5px] text-stone-400 mt-0.5">
                    Best in set: <span className="font-medium text-stone-600">{item.bestPlatformName}</span>
                    {' '}at{' '}
                    <span className="tabular-nums font-medium text-amber-600">
                      {((item.bestScore / (item.isComplianceGate ? 1 : MAX_SCORE)) * 100).toFixed(0)}%
                    </span>
                  </p>
                )}
                {item.type === 'uncovered' && (
                  <p className="text-[11.5px] text-stone-400 mt-0.5">No evaluation data available</p>
                )}
              </div>
            </div>

            {/* Helper platform suggestions */}
            {item.helperPlatforms.length > 0 && (
              <div className="ml-4 flex flex-wrap gap-2 mt-1">
                <span className="text-[11px] text-stone-400 self-center">Could be helped by:</span>
                {item.helperPlatforms.map(hp => (
                  <span
                    key={hp.name}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/70 bg-emerald-50/50 px-2.5 py-0.5 text-[11.5px] font-medium text-emerald-800"
                  >
                    {hp.name}
                    <span className="text-emerald-600 tabular-nums">
                      {((hp.score / MAX_SCORE) * 100).toFixed(0)}%
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Platform Profile View (single platform selected) ─────────────────────────

function PlatformProfileView({ profile: p }: { profile: PlatformProfile }) {
  const tier = getRecommendedAction(p.overallPct)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-emerald-950">{p.name}</h2>
            <p className="text-sm text-stone-500 mt-0.5">{p.vendor}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-bold tabular-nums text-emerald-800">
              {p.overallPct.toFixed(1)}%
            </p>
            <span className={`inline-flex mt-1.5 items-center rounded-full px-3 py-0.5 text-[12px] font-semibold text-white ${tierColor(tier)}`}>
              {tier.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        <div className="mt-4 h-2.5 rounded-full bg-emerald-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-600"
            style={{ width: `${Math.min(100, p.overallPct)}%` }}
          />
        </div>
      </div>

      {/* Category breakdown */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-emerald-950">Category Breakdown</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Categories below {GAP_CATEGORY_THRESHOLD}% are flagged as gaps
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {p.categoryBreakdown.map(c => {
            const isGap      = c.pct < GAP_CATEGORY_THRESHOLD
            const isCritical = c.pct < 50
            return (
              <div
                key={c.category}
                className={`rounded-lg border p-3.5 space-y-2 ${
                  isCritical ? 'border-red-200/80 bg-red-50/30'
                  : isGap    ? 'border-amber-200/80 bg-amber-50/30'
                             : 'border-stone-200/60 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-medium text-stone-700 truncate">{c.category}</p>
                  <span className={`text-[13px] font-bold tabular-nums shrink-0 ${scoreColor(c.pct)}`}>
                    {c.pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isCritical ? 'bg-red-500' : isGap ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, c.pct)}%` }}
                  />
                </div>
                {isGap && (
                  <p className={`text-[10.5px] font-medium ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                    {isCritical ? 'Critical gap' : 'Needs attention'}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Gap filler suggestions */}
      {p.gapSuggestions.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">Gap Filler Suggestions</h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Other active platforms that score well in {p.name}&apos;s gap categories
            </p>
          </div>
          <div className="space-y-3">
            {p.gapSuggestions.map(gap => (
              <div key={gap.category} className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${gap.platformPct < 50 ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <p className="text-[13px] font-semibold text-stone-800">{gap.category}</p>
                  <span className={`text-[11.5px] tabular-nums font-medium ${gap.platformPct < 50 ? 'text-red-600' : 'text-amber-600'}`}>
                    {p.name}: {gap.platformPct.toFixed(0)}%
                  </span>
                </div>
                {gap.alternatives.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {gap.alternatives.map(alt => (
                      <div key={alt.id} className="flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3.5 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-stone-800 truncate">{alt.name}</p>
                          <p className="text-[11px] text-stone-400">{alt.vendor}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold tabular-nums text-emerald-700">{alt.pct.toFixed(0)}%</p>
                          <p className="text-[10px] text-stone-400">in this category</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">No other evaluated platform scores well here</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-5 text-center">
          <p className="text-sm font-medium text-emerald-800">No significant gaps identified</p>
          <p className="text-xs text-stone-400 mt-1">
            This platform scores above {GAP_CATEGORY_THRESHOLD}% in all evaluated categories.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Requirement Satisfaction Section ────────────────────────────────────────

function RequirementSatisfactionSection({ analysis: a }: { analysis: CombinedAnalysis }) {
  const satisfactionPct = a.totalCount > 0
    ? (a.satisfiedCount / a.totalCount) * 100
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-base font-semibold text-emerald-950">Requirement Satisfaction</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            How well the recommended combination meets each requirement (≥75% score = satisfied)
          </p>
        </div>
        <div className="flex-1 border-t border-stone-200/80" />
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/40 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-700">{a.satisfiedCount}</p>
          <p className="text-[11px] font-medium text-emerald-700 mt-0.5">Satisfied</p>
          <p className="text-[10.5px] text-stone-400">score ≥75%</p>
        </div>
        <div className="rounded-lg border border-amber-200/70 bg-amber-50/40 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-amber-600">{a.partialCount}</p>
          <p className="text-[11px] font-medium text-amber-600 mt-0.5">Partially Met</p>
          <p className="text-[10.5px] text-stone-400">score &gt;0, &lt;75%</p>
        </div>
        <div className="rounded-lg border border-red-200/70 bg-red-50/40 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-red-600">{a.uncoveredCount}</p>
          <p className="text-[11px] font-medium text-red-600 mt-0.5">Not Covered</p>
          <p className="text-[10.5px] text-stone-400">no evaluation data</p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="h-3 flex rounded-full overflow-hidden gap-px">
        {a.satisfiedCount > 0 && (
          <div
            className="bg-emerald-500 first:rounded-l-full"
            style={{ width: `${(a.satisfiedCount / a.totalCount) * 100}%` }}
          />
        )}
        {a.partialCount > 0 && (
          <div
            className="bg-amber-400"
            style={{ width: `${(a.partialCount / a.totalCount) * 100}%` }}
          />
        )}
        {a.uncoveredCount > 0 && (
          <div
            className="bg-red-400 last:rounded-r-full flex-1"
          />
        )}
      </div>
      <div className="flex items-center gap-4 text-[11px] text-stone-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Satisfied ({satisfactionPct.toFixed(0)}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          Partial ({a.totalCount > 0 ? ((a.partialCount / a.totalCount) * 100).toFixed(0) : 0}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
          Not covered ({a.totalCount > 0 ? ((a.uncoveredCount / a.totalCount) * 100).toFixed(0) : 0}%)
        </span>
      </div>

      {/* Per-category breakdown */}
      <div className="rounded-xl border border-stone-200/80 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 bg-stone-50/60">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Satisfaction by Category
          </p>
        </div>
        <div className="divide-y divide-stone-100">
          {a.categorySatisfaction.map(cat => {
            const catSatPct = cat.total > 0 ? (cat.satisfied / cat.total) * 100 : 0
            return (
              <div key={cat.category} className="flex items-center gap-4 px-5 py-3">
                <p className="w-40 shrink-0 text-sm text-stone-700 truncate">{cat.category}</p>

                {/* Stacked micro-bar */}
                <div className="flex-1 h-2 flex rounded-full overflow-hidden gap-px">
                  {cat.satisfied > 0 && (
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${(cat.satisfied / cat.total) * 100}%` }}
                    />
                  )}
                  {cat.partial > 0 && (
                    <div
                      className="bg-amber-400"
                      style={{ width: `${(cat.partial / cat.total) * 100}%` }}
                    />
                  )}
                  {cat.uncovered > 0 && (
                    <div className="bg-red-400 flex-1" />
                  )}
                </div>

                {/* Counts */}
                <div className="flex items-center gap-3 shrink-0 text-right">
                  <span className={`text-[12px] font-bold tabular-nums w-10 text-right ${
                    catSatPct >= 75 ? 'text-emerald-700' :
                    catSatPct >= 50 ? 'text-amber-600'   : 'text-red-600'
                  }`}>
                    {catSatPct.toFixed(0)}%
                  </span>
                  <span className="text-[11px] text-stone-400 tabular-nums w-24 text-right">
                    {cat.satisfied}/{cat.total} satisfied
                  </span>
                  {(cat.partial > 0 || cat.uncovered > 0) && (
                    <div className="flex items-center gap-1.5">
                      {cat.partial > 0 && (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200/60">
                          {cat.partial} partial
                        </span>
                      )}
                      {cat.uncovered > 0 && (
                        <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-200/60">
                          {cat.uncovered} missing
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-3 text-3xl text-stone-300">-</div>
      <p className="text-sm font-medium text-stone-500">{message}</p>
      <p className="text-xs text-stone-400 mt-1">{hint}</p>
    </div>
  )
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function scoreColor(pct: number | null): string {
  if (pct === null) return 'text-stone-400'
  if (pct >= 70)    return 'text-emerald-700'
  if (pct >= 50)    return 'text-amber-600'
  return 'text-red-600'
}

function tierColor(tier: ReturnType<typeof getRecommendedAction>): string {
  switch (tier) {
    case 'TOP_PICK':        return 'bg-emerald-600'
    case 'RECOMMENDED':     return 'bg-emerald-500'
    case 'CONSIDER':        return 'bg-amber-500'
    case 'NOT_RECOMMENDED': return 'bg-stone-500'
  }
}
