import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  calculateWeightedPercentage,
  getRecommendedAction,
  applyContextWeights,
} from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'
import type { WeightLevel } from '@prisma/client'
import type { EvaluationState, PlatformStatus, VitalRisk, VitalVerdict } from '@prisma/client'
import {
  getLinkedVitalProfiles,
  parseVitalFilterFromSearchParams,
  matchesVitalFilter,
} from '@/lib/vital/profile'
import ComparisonTable from './ComparisonTable'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PlatformRow = {
  id: string
  name: string
  vendor: string
  status: PlatformStatus
  evalState: EvaluationState | null
  compliancePass: boolean | null
  categoryScores: Record<string, number | null>
  overallPct: number | null
  recommendation: ReturnType<typeof getRecommendedAction> | 'DISQUALIFIED' | null
  vital: {
    verdict: VitalVerdict | null
    score50: number | null
    risk: VitalRisk | null
  } | null
  agreedAgeRange: { ageMin: number; ageMax: number } | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toScoringReq(r: {
  id: string
  weight: 'HIGH' | 'MEDIUM' | 'LOW'
  category: string | null
  isComplianceGate: boolean
}): Requirement {
  return { ...r, contextIds: [] }
}

function toScoringScore(s: {
  requirementId: string
  value: number | null
  evidenceType: string | null
}): Score {
  return {
    requirementId: s.requirementId,
    value: s.value,
    evidenceType: s.evidenceType as Score['evidenceType'],
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function ComparisonPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'view:results')) redirect('/dashboard')

  const sp          = await searchParams
  const contextIds  = (typeof sp.context  === 'string' ? sp.context  : '').split(',').filter(Boolean)
  const platformIds = (typeof sp.platform === 'string' ? sp.platform : '').split(',').filter(Boolean)
  const statuses    = (typeof sp.status   === 'string' ? sp.status   : 'FINALISED').split(',').filter(Boolean)
  const showDq      = sp.showDq === '1'
  const vitalFilter = parseVitalFilterFromSearchParams(sp)
  const filterAges = (typeof sp.age === 'string' ? sp.age : '').split(',').filter(Boolean).map(Number)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const [rawRequirements, rawPlatforms, evaluations, contextOverrides, allAgeRanges] = await Promise.all([
    prisma.requirement.findMany({
      where: {
        ...(contextIds.length > 0 && { contexts: { some: { contextId: { in: contextIds } } } }),
      },
      select: {
        id: true,
        weight: true,
        category: true,
        evaluatorType: true,
        isComplianceGate: true,
      },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    }),

    prisma.platform.findMany({
      where: {
        track: { not: 'VITAL' },
        ...(platformIds.length > 0 && { id: { in: platformIds } }),
        ...(!showDq                && { status: { not: 'DISQUALIFIED' } }),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, vendor: true, status: true },
    }),

    prisma.evaluation.findMany({
      where: { state: { in: statuses as ('FINALISED' | 'MERGED' | 'IN_PROGRESS')[] } },
      select: {
        id: true,
        platformId: true,
        state: true,
        lockedAt: true,
        scores: {
          select: { requirementId: true, value: true, evidenceType: true },
        },
      },
    }),
    // Fetch context-specific weight overrides when filtering by context
    contextIds.length > 0
      ? prisma.requirementContext.findMany({
          where: { contextId: { in: contextIds } },
          select: { requirementId: true, weightOverride: true },
        })
      : Promise.resolve([] as { requirementId: string; weightOverride: WeightLevel | null }[]),

    // Fetch pedagogy age ranges for results filtering.
    // Ordered by updatedAt desc so the most recent submission wins when grouped.
    prisma.platformAgeRange.findMany({
      where: {
        evaluatorType: 'PEDAGOGY',
        evaluation: { state: { in: statuses as ('FINALISED' | 'MERGED' | 'IN_PROGRESS')[] } },
      },
      select: {
        evaluationId: true,
        ageMin: true,
        ageMax: true,
        evaluation: { select: { platformId: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  // ── VITAL profiles (opt-in link to the VITAL track) ────────────────────────

  // Snapshot of each linked platform's VITAL standing. Drives the VITAL column,
  // the scatter chart and the opt-in VITAL filters. Empty until a VitalTool is
  // linked to a platform in VITAL admin, so the feature stays inert otherwise.
  const vitalProfiles = await getLinkedVitalProfiles(rawPlatforms.map(p => p.id))

  const platforms = vitalFilter
    ? rawPlatforms.filter(p => matchesVitalFilter(vitalProfiles.get(p.id), vitalFilter))
    : rawPlatforms

  // ── Context weight overrides ───────────────────────────────────────────────

  // When multiple contexts are selected and a requirement appears in both with
  // different overrides, last-write wins. For single-context filtering this is deterministic.
  const weightOverrideMap = new Map<string, WeightLevel>(
    contextOverrides
      .filter((o): o is { requirementId: string; weightOverride: WeightLevel } => o.weightOverride !== null)
      .map(o => [o.requirementId, o.weightOverride]),
  )

  // ── Derived lookups ────────────────────────────────────────────────────────

  const categories = [
    ...new Set(
      rawRequirements
        .filter(r => !r.isComplianceGate)
        .map(r => r.category)
        .filter((c): c is string => c !== null),
    ),
  ].sort()

  const complianceReqs = rawRequirements
    .filter(r => r.isComplianceGate)
    .map(toScoringReq)

  const reqsByCategory = new Map<string, Requirement[]>()
  for (const cat of categories) {
    reqsByCategory.set(
      cat,
      applyContextWeights(
        rawRequirements
          .filter(r => r.category === cat && !r.isComplianceGate)
          .map(toScoringReq),
        weightOverrideMap,
      ),
    )
  }

  const allScoredReqs = applyContextWeights(
    rawRequirements.filter(r => !r.isComplianceGate).map(toScoringReq),
    weightOverrideMap,
  )

  // Best evaluation per platform (prefer FINALISED over MERGED)
  const evalByPlatform = new Map<string, (typeof evaluations)[number]>()
  for (const ev of evaluations) {
    const existing = evalByPlatform.get(ev.platformId)
    if (!existing) { evalByPlatform.set(ev.platformId, ev); continue }
    if (ev.state === 'FINALISED' && existing.state !== 'FINALISED') {
      evalByPlatform.set(ev.platformId, ev)
    }
  }

  // Most-recent pedagogy age range per platform (ordered desc, so first-seen wins).
  const ageRangeByPlatform = new Map<string, { ageMin: number; ageMax: number }>()
  for (const r of allAgeRanges) {
    const platformId = r.evaluation.platformId
    if (!ageRangeByPlatform.has(platformId)) {
      ageRangeByPlatform.set(platformId, { ageMin: r.ageMin, ageMax: r.ageMax })
    }
  }

  // ── Build rows ─────────────────────────────────────────────────────────────

  const vitalOf = (id: string): PlatformRow['vital'] => {
    const prof = vitalProfiles.get(id)
    if (!prof) return null
    return { verdict: prof.verdict, score50: prof.v2Score50, risk: prof.deFactoRisk }
  }

  const rows: PlatformRow[] = platforms.map(p => {
    const ev = evalByPlatform.get(p.id) ?? null
    const agreedAgeRange = ageRangeByPlatform.get(p.id) ?? null

    if (!ev) {
      return {
        id: p.id, name: p.name, vendor: p.vendor, status: p.status,
        evalState: null,
        compliancePass: null,
        categoryScores: Object.fromEntries(categories.map(c => [c, null])),
        overallPct: null,
        recommendation: null,
        vital: vitalOf(p.id),
        agreedAgeRange,
      }
    }

    const allScores = ev.scores.map(toScoringScore)

    const cgPass = complianceReqs.length === 0
      ? null
      : !complianceReqs.some(r =>
          allScores.some(s => s.requirementId === r.id && s.value === 0),
        )

    const categoryScores: Record<string, number | null> = {}
    for (const cat of categories) {
      const reqs = reqsByCategory.get(cat) ?? []
      categoryScores[cat] = reqs.length
        ? calculateWeightedPercentage(allScores, reqs)
        : null
    }

    const overallPct = allScoredReqs.length
      ? calculateWeightedPercentage(allScores, allScoredReqs)
      : null

    const recommendation =
      p.status === 'DISQUALIFIED'
        ? ('DISQUALIFIED' as const)
        : overallPct !== null
        ? getRecommendedAction(overallPct)
        : null

    return {
      id: p.id, name: p.name, vendor: p.vendor, status: p.status,
      evalState: ev.state,
      compliancePass: cgPass,
      categoryScores,
      overallPct,
      recommendation,
      vital: vitalOf(p.id),
      agreedAgeRange,
    }
  })

  // Apply age filter: keep platforms whose agreed range contains at least one selected age
  const filteredRows = filterAges.length > 0
    ? rows.filter(r =>
        r.agreedAgeRange !== null &&
        filterAges.some(age => age >= r.agreedAgeRange!.ageMin && age <= r.agreedAgeRange!.ageMax),
      )
    : rows

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (filteredRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-3xl text-stone-300">-</div>
        <p className="text-sm font-medium text-stone-500">No platforms match the current filters</p>
        <p className="text-xs text-stone-400 mt-1">
          Try adjusting the context or platform filter above
        </p>
      </div>
    )
  }

  const hasVital = filteredRows.some(r => r.vital !== null)

  return (
    <div className="space-y-5">
      <ComparisonTable rows={filteredRows} categories={categories} hasVital={hasVital} />
    </div>
  )
}
