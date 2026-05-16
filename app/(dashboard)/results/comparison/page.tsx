import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  calculateWeightedPercentage,
  getRecommendedAction,
} from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'
import type { EvaluationState, PlatformStatus } from '@prisma/client'
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
  recommendation: ReturnType<typeof getRecommendedAction> | null
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

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const [rawRequirements, rawPlatforms, evaluations] = await Promise.all([
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
  ])

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
      rawRequirements
        .filter(r => r.category === cat && !r.isComplianceGate)
        .map(toScoringReq),
    )
  }

  const allScoredReqs = rawRequirements
    .filter(r => !r.isComplianceGate)
    .map(toScoringReq)

  // Best evaluation per platform (prefer FINALISED over MERGED)
  const evalByPlatform = new Map<string, (typeof evaluations)[number]>()
  for (const ev of evaluations) {
    const existing = evalByPlatform.get(ev.platformId)
    if (!existing) { evalByPlatform.set(ev.platformId, ev); continue }
    if (ev.state === 'FINALISED' && existing.state !== 'FINALISED') {
      evalByPlatform.set(ev.platformId, ev)
    }
  }

  // ── Build rows ─────────────────────────────────────────────────────────────

  const rows: PlatformRow[] = rawPlatforms.map(p => {
    const ev = evalByPlatform.get(p.id) ?? null

    if (!ev) {
      return {
        id: p.id, name: p.name, vendor: p.vendor, status: p.status,
        evalState: null,
        compliancePass: null,
        categoryScores: Object.fromEntries(categories.map(c => [c, null])),
        overallPct: null,
        recommendation: null,
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
    }
  })

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (rows.length === 0) {
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

  return <ComparisonTable rows={rows} categories={categories} />
}
