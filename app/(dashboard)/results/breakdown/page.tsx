import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { calculateWeightedPercentage } from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'
import type { PlatformStatus } from '@prisma/client'
import { ChartToggle } from './ChartToggle'
import { CategoryChart } from './CategoryChart'
import type { CategoryPoint } from './CategoryChart'

// ─── Local helpers (identical pattern to comparison page) ─────────────────────

const EVIDENCE_HIGH = new Set(['TRIAL', 'DEMO'])
const EVIDENCE_LOW  = new Set(['DOCUMENTATION', 'VENDOR_CLAIM'])

function applyEvidenceFilter(scores: Score[], filter: string | null): Score[] {
  if (!filter) return scores
  if (filter === 'high') return scores.filter(s => s.evidenceType && EVIDENCE_HIGH.has(s.evidenceType))
  if (filter === 'low')  return scores.filter(s => s.evidenceType && EVIDENCE_LOW.has(s.evidenceType))
  return scores
}

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

// ─── Types ─────────────────────────────────────────────────────────────────────

type PlatformChart = {
  id: string
  name: string
  vendor: string
  status: PlatformStatus
  hasEval: boolean
  categories: CategoryPoint[]
  overallPct: number | null
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

  const sp             = await searchParams
  const contextId      = typeof sp.context         === 'string' ? sp.context         : null
  const platformId     = typeof sp.platform        === 'string' ? sp.platform        : null
  const categoryFilter = typeof sp.category        === 'string' ? sp.category        : null
  const evalTypeFilter = typeof sp.evaluatorType   === 'string' ? sp.evaluatorType   : null
  const evidenceFilter = typeof sp.evidenceQuality === 'string' ? sp.evidenceQuality : null
  const chartType      = sp.chart === 'radar' ? 'radar' : 'bar'

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const [rawRequirements, rawPlatforms, evaluations] = await Promise.all([
    prisma.requirement.findMany({
      where: {
        evaluatorType: { not: 'COMPLIANCE' },
        ...(contextId      && { contexts: { some: { contextId } } }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(evalTypeFilter && { evaluatorType: evalTypeFilter as 'PEDAGOGY' | 'TECHNICAL' }),
      },
      select: { id: true, weight: true, category: true, isComplianceGate: true },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    }),

    prisma.platform.findMany({
      where: {
        ...(platformId && { id: platformId }),
        ...(contextId  && { contexts: { some: { contextId } } }),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, vendor: true, status: true },
    }),

    prisma.evaluation.findMany({
      where: { state: { in: ['FINALISED', 'MERGED'] } },
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

  // ── Build per-platform category breakdown ─────────────────────────────────

  const allCategories = [...new Set(
    rawRequirements.map(r => r.category ?? 'General'),
  )].sort()

  // Map: platformId → best evaluation
  const evalByPlatform = new Map<string, (typeof evaluations)[number]>()
  for (const ev of evaluations) {
    const cur = evalByPlatform.get(ev.platformId)
    if (!cur || (ev.state === 'FINALISED' && cur.state !== 'FINALISED')) {
      evalByPlatform.set(ev.platformId, ev)
    }
  }

  const platformCharts: PlatformChart[] = rawPlatforms.map(p => {
    const ev = evalByPlatform.get(p.id)
    if (!ev) {
      return {
        id: p.id, name: p.name, vendor: p.vendor, status: p.status,
        hasEval: false,
        categories: allCategories.map(cat => ({ category: cat, pct: null })),
        overallPct: null,
      }
    }

    const allScores = ev.scores.map(toScoringScore)
    const filtered  = applyEvidenceFilter(allScores, evidenceFilter)

    const categories: CategoryPoint[] = allCategories.map(cat => {
      const catReqs = rawRequirements
        .filter(r => (r.category ?? 'General') === cat)
        .map(toScoringReq)
      const pct = catReqs.length
        ? calculateWeightedPercentage(filtered, catReqs) || null
        : null
      return { category: cat, pct }
    })

    const allReqs   = rawRequirements.map(toScoringReq)
    const overallPct = allReqs.length
      ? calculateWeightedPercentage(filtered, allReqs)
      : null

    return {
      id: p.id, name: p.name, vendor: p.vendor, status: p.status,
      hasEval: true,
      categories,
      overallPct: overallPct || null,
    }
  })

  // ── Empty state ────────────────────────────────────────────────────────────

  if (platformCharts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-3xl text-stone-300">—</div>
        <p className="text-sm font-medium text-stone-500">No platforms match the current filters</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-stone-700">
            Category Breakdown
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {allCategories.length} {allCategories.length === 1 ? 'category' : 'categories'} ·{' '}
            {platformCharts.length} {platformCharts.length === 1 ? 'platform' : 'platforms'}
          </p>
        </div>
        <Suspense>
          <ChartToggle active={chartType} />
        </Suspense>
      </div>

      {/* Platform grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {platformCharts.map(p => (
          <PlatformCard
            key={p.id}
            platform={p}
            chartType={chartType}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Platform card ─────────────────────────────────────────────────────────────

function PlatformCard({
  platform: p,
  chartType,
}: {
  platform: PlatformChart
  chartType: 'bar' | 'radar'
}) {
  const isDisqualified = p.status === 'DISQUALIFIED'

  return (
    <div className={`rounded-xl border bg-white overflow-hidden ${
      isDisqualified ? 'border-destructive/30' : 'border-stone-200/80'
    }`}>
      {/* Card header */}
      <div className={`px-4 pt-4 pb-3 border-b ${
        isDisqualified ? 'bg-destructive/5 border-destructive/20' : 'border-stone-100'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={`text-[13px] font-semibold leading-snug truncate ${
              isDisqualified ? 'line-through text-destructive/70' : 'text-emerald-950'
            }`}>
              {p.name}
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">{p.vendor}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isDisqualified && (
              <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive ring-1 ring-destructive/20">
                DQ
              </span>
            )}
            {p.overallPct !== null && !isDisqualified && (
              <span className={`text-[12px] font-semibold tabular-nums ${
                p.overallPct >= 85 ? 'text-emerald-700' :
                p.overallPct >= 70 ? 'text-emerald-600' :
                p.overallPct >= 50 ? 'text-amber-600'  : 'text-red-600'
              }`}>
                {p.overallPct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="p-2">
        {!p.hasEval ? (
          <div className="flex items-center justify-center h-[220px] text-stone-300 text-sm">
            No evaluation data
          </div>
        ) : p.categories.every(c => c.pct === null) ? (
          <div className="flex items-center justify-center h-[220px] text-stone-300 text-sm">
            No scored requirements in this filter
          </div>
        ) : (
          <CategoryChart
            data={p.categories}
            chartType={chartType}
            platformName={p.name}
          />
        )}
      </div>

      {/* Category stats strip */}
      {p.hasEval && p.categories.some(c => c.pct !== null) && (
        <CategoryStatsStrip categories={p.categories} />
      )}
    </div>
  )
}

// ─── Best / worst category strip ──────────────────────────────────────────────

function CategoryStatsStrip({ categories }: { categories: CategoryPoint[] }) {
  const scored = categories
    .filter((c): c is { category: string; pct: number } => c.pct !== null)
    .sort((a, b) => b.pct - a.pct)

  if (scored.length === 0) return null

  const best  = scored[0]
  const worst = scored[scored.length - 1]

  return (
    <div className="flex border-t border-stone-100 divide-x divide-stone-100 text-[11px]">
      <div className="flex-1 px-3 py-2">
        <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium mb-0.5">Best</p>
        <p className="text-emerald-700 font-medium truncate">
          {best.category}
          <span className="ml-1 tabular-nums text-stone-400">{best.pct.toFixed(0)}%</span>
        </p>
      </div>
      {scored.length > 1 && (
        <div className="flex-1 px-3 py-2">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium mb-0.5">Gap</p>
          <p className="text-amber-700 font-medium truncate">
            {worst.category}
            <span className="ml-1 tabular-nums text-stone-400">{worst.pct.toFixed(0)}%</span>
          </p>
        </div>
      )}
    </div>
  )
}
