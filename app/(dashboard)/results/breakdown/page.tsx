import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { calculateWeightedPercentage } from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'
import {
  getLinkedVitalProfiles,
  parseVitalFilterFromSearchParams,
  matchesVitalFilter,
} from '@/lib/vital/profile'
import { ChartToggle } from './ChartToggle'
import { ComparisonChart } from './ComparisonChart'
import type { PlatformSeries } from './ComparisonChart'

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BreakdownPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'view:results')) redirect('/dashboard')

  const sp              = await searchParams
  const contextIds      = (typeof sp.context         === 'string' ? sp.context         : '').split(',').filter(Boolean)
  const platformIds     = (typeof sp.platform        === 'string' ? sp.platform        : '').split(',').filter(Boolean)
  const categoryFilters = (typeof sp.category        === 'string' ? sp.category        : '').split(',').filter(Boolean)
  const evalTypeFilter  = typeof sp.evaluatorType   === 'string' ? sp.evaluatorType   : null
  const statuses        = (typeof sp.status === 'string' ? sp.status : 'FINALISED').split(',').filter(Boolean)
  const chartType       = sp.chart === 'radar' ? 'radar' : 'bar'
  const showDq          = sp.showDq === '1'
  const vitalFilter     = parseVitalFilterFromSearchParams(sp)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const [rawRequirements, rawPlatformsAll, evaluations] = await Promise.all([
    prisma.requirement.findMany({
      where: {
        ...(contextIds.length      > 0 && { contexts: { some: { contextId: { in: contextIds } } } }),
        ...(categoryFilters.length > 0 && { category: { in: categoryFilters } }),
        ...(evalTypeFilter             && { evaluatorType: evalTypeFilter as 'PEDAGOGY' | 'TECHNICAL' | 'BOTH' }),
      },
      select: { id: true, weight: true, category: true, isComplianceGate: true },
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
  ])

  // ── Optional VITAL filter (narrows to linked platforms that match) ──────────

  const vitalProfiles = vitalFilter
    ? await getLinkedVitalProfiles(rawPlatformsAll.map(p => p.id))
    : null
  const rawPlatforms = vitalFilter
    ? rawPlatformsAll.filter(p => matchesVitalFilter(vitalProfiles!.get(p.id), vitalFilter))
    : rawPlatformsAll

  // ── Build data ─────────────────────────────────────────────────────────────

  const allCategories = [...new Set(
    rawRequirements.map(r => r.category ?? 'General'),
  )].sort()

  const evalByPlatform = new Map<string, (typeof evaluations)[number]>()
  for (const ev of evaluations) {
    const cur = evalByPlatform.get(ev.platformId)
    if (!cur || (ev.state === 'FINALISED' && cur.state !== 'FINALISED')) {
      evalByPlatform.set(ev.platformId, ev)
    }
  }

  const platforms: PlatformSeries[] = rawPlatforms
    .filter(p => evalByPlatform.has(p.id))
    .map(p => {
    const ev = evalByPlatform.get(p.id)!
    if (!ev) {
      return {
        id: p.id, name: p.name, vendor: p.vendor,
        scores: Object.fromEntries(allCategories.map(c => [c, null])),
      }
    }

    const allScores = ev.scores.map(toScoringScore)

    const scores: Record<string, number | null> = {}
    for (const cat of allCategories) {
      const catReqs = rawRequirements
        .filter(r => (r.category ?? 'General') === cat)
        .map(toScoringReq)
      scores[cat] = catReqs.length
        ? calculateWeightedPercentage(allScores, catReqs) || null
        : null
    }

    return { id: p.id, name: p.name, vendor: p.vendor, scores }
  })

  // ── Empty states ───────────────────────────────────────────────────────────

  if (platforms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-3xl text-stone-300">-</div>
        <p className="text-sm font-medium text-stone-500">No platforms match the current filters</p>
        <p className="text-xs text-stone-400 mt-1">Adjust the filters above or add platforms</p>
      </div>
    )
  }

  if (allCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-3xl text-stone-300">-</div>
        <p className="text-sm font-medium text-stone-500">No requirement categories found</p>
        <p className="text-xs text-stone-400 mt-1">Assign categories to requirements in admin settings</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-stone-700">Category Breakdown</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {allCategories.length} {allCategories.length === 1 ? 'category' : 'categories'} ·{' '}
            {platforms.length} {platforms.length === 1 ? 'platform' : 'platforms'} · select up to 3 to compare
          </p>
        </div>
        <Suspense>
          <ChartToggle active={chartType} />
        </Suspense>
      </div>

      {/* Consolidated comparison chart */}
      <ComparisonChart
        platforms={platforms}
        categories={allCategories}
        chartType={chartType}
      />
    </div>
  )
}
