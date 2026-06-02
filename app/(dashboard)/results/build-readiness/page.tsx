import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { calculateWeightedPercentage } from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'
import type { PlatformStatus, WeightLevel } from '@prisma/client'
import { FullscreenWrapper } from '@/components/ui/fullscreen-wrapper'

// ─── Build-readiness category ──────────────────────────────────────────────────
// Build Readiness is scored solely from requirements in this single category.

const BUILD_READINESS_CATEGORY = 'Integration & APIs'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toScoringReq(r: {
  id: string; weight: WeightLevel
  category: string | null; isComplianceGate: boolean
}): Requirement {
  return { ...r, contextIds: [] }
}

function toScore(s: { requirementId: string; value: number | null; evidenceType: string | null }): Score {
  return { requirementId: s.requirementId, value: s.value, evidenceType: s.evidenceType as Score['evidenceType'] }
}

function pctColor(pct: number | null): string {
  if (pct === null) return 'bg-stone-200'
  if (pct >= 85)   return 'bg-emerald-600'
  if (pct >= 70)   return 'bg-emerald-500'
  if (pct >= 50)   return 'bg-amber-400'
  return 'bg-red-400'
}

function pctTextColor(pct: number | null): string {
  if (pct === null) return 'text-stone-400'
  if (pct >= 85)   return 'text-emerald-700'
  if (pct >= 70)   return 'text-emerald-600'
  if (pct >= 50)   return 'text-amber-600'
  return 'text-red-600'
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type ReqScore = {
  id: string
  title: string
  weight: WeightLevel
  pct: number | null
}

type PlatformReadiness = {
  platform: { id: string; name: string; vendor: string; status: PlatformStatus }
  hasEval: boolean
  overallPct: number | null
  reqCount: number
  reqScores: ReqScore[]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BuildReadinessPage({
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

  const [rawPlatforms, buildReqsRaw, evaluations] = await Promise.all([
    prisma.platform.findMany({
      where: {
        track: { not: 'VITAL' },
        ...(platformIds.length > 0 && { id: { in: platformIds } }),
        ...(!showDq                && { status: { not: 'DISQUALIFIED' } }),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, vendor: true, status: true },
    }),

    // Build readiness = the single "Integration & APIs" category only.
    prisma.requirement.findMany({
      where: {
        category: BUILD_READINESS_CATEGORY,
        ...(contextIds.length > 0 && { contexts: { some: { contextId: { in: contextIds } } } }),
      },
      orderBy: [{ weight: 'desc' }, { order: 'asc' }],
      select: { id: true, title: true, weight: true, category: true, isComplianceGate: true },
    }),

    prisma.evaluation.findMany({
      where: { state: { in: statuses as ('FINALISED' | 'MERGED' | 'IN_PROGRESS')[] } },
      select: {
        id: true, platformId: true, state: true, lockedAt: true,
        scores: { select: { requirementId: true, value: true, evidenceType: true } },
      },
    }),
  ])

  const buildReqs = buildReqsRaw.map(toScoringReq)

  // Best eval per platform (prefer FINALISED)
  const evalByPlatform = new Map<string, (typeof evaluations)[number]>()
  for (const ev of evaluations) {
    const cur = evalByPlatform.get(ev.platformId)
    if (!cur || (ev.state === 'FINALISED' && cur.state !== 'FINALISED')) {
      evalByPlatform.set(ev.platformId, ev)
    }
  }

  // ── Compute per-platform readiness ────────────────────────────────────────

  const readiness: PlatformReadiness[] = rawPlatforms.map(p => {
    const ev = evalByPlatform.get(p.id)
    if (!ev) {
      return {
        platform: p, hasEval: false,
        overallPct: null, reqCount: buildReqs.length,
        reqScores: buildReqsRaw.map(r => ({ id: r.id, title: r.title, weight: r.weight, pct: null })),
      }
    }

    const scores     = ev.scores.map(toScore)
    const overallPct = buildReqs.length ? calculateWeightedPercentage(scores, buildReqs) : null

    // Per-requirement coverage (average of non-N/A scores, /4)
    const reqScores: ReqScore[] = buildReqsRaw.map(r => {
      const vals = scores
        .filter(s => s.requirementId === r.id && s.value !== null)
        .map(s => s.value as number)
      const pct = vals.length
        ? (vals.reduce((a, b) => a + b, 0) / vals.length / 4) * 100
        : null
      return { id: r.id, title: r.title, weight: r.weight, pct }
    })

    return {
      platform: p, hasEval: true,
      overallPct: overallPct ?? null,
      reqCount: buildReqs.length,
      reqScores,
    }
  })
    // Sort: highest score first, no-eval at bottom, DQ after active
    .sort((a, b) => {
      if (a.platform.status !== b.platform.status) {
        return a.platform.status === 'ACTIVE' ? -1 : 1
      }
      return (b.overallPct ?? -1) - (a.overallPct ?? -1)
    })

  // ── Empty states ──────────────────────────────────────────────────────────

  if (readiness.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-3xl text-stone-300">-</div>
        <p className="text-sm font-medium text-stone-500">No platforms match the current filters</p>
      </div>
    )
  }

  const hasAnyBuildReqs = buildReqs.length > 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <FullscreenWrapper title="Build Readiness">
    <div className="space-y-5">
      {/* Key */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-700">
            Build Readiness: Technical Integration Score
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            {hasAnyBuildReqs
              ? `Scored solely from the ${BUILD_READINESS_CATEGORY} category · ${buildReqs.length} requirement${buildReqs.length !== 1 ? 's' : ''}`
              : `No requirements found in the ${BUILD_READINESS_CATEGORY} category`
            }
          </p>
        </div>
        <div className="shrink-0">
          <span className="inline-flex items-center rounded-md bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600 ring-1 ring-inset ring-stone-200">
            {BUILD_READINESS_CATEGORY}
          </span>
        </div>
      </div>

      {!hasAnyBuildReqs && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-sm text-amber-700">
          No requirements are categorised as <strong>{BUILD_READINESS_CATEGORY}</strong>. Assign
          requirements to this category for build-readiness scores to appear.
        </div>
      )}

      {/* Ranked list */}
      <div className="space-y-3">
        {readiness.map((item, i) => (
          <ReadinessCard key={item.platform.id} item={item} rank={i + 1} />
        ))}
      </div>
    </div>
    </FullscreenWrapper>
  )
}

// ─── Platform readiness card ───────────────────────────────────────────────────

function ReadinessCard({ item, rank }: { item: PlatformReadiness; rank: number }) {
  const { platform: p, overallPct, hasEval, reqScores } = item
  const isDQ = p.status === 'DISQUALIFIED'

  const scoredReqs = reqScores.filter(r => r.pct !== null)

  return (
    <div className={`rounded-xl border bg-white overflow-hidden ${
      isDQ ? 'border-destructive/30' : 'border-stone-200/80'
    }`}>
      {/* Header row */}
      <div className={`flex items-center gap-4 px-5 py-4 ${isDQ ? 'bg-destructive/5' : ''}`}>
        {/* Rank */}
        <span className="text-xl font-bold tabular-nums text-stone-300 w-7 shrink-0 text-center">
          {rank}
        </span>

        {/* Platform info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-[14px] font-semibold ${
              isDQ ? 'text-destructive/70 line-through' : 'text-emerald-950'
            }`}>
              {p.name}
            </h3>
            {isDQ && (
              <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive ring-1 ring-destructive/20">
                DQ
              </span>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-0.5">{p.vendor}</p>
        </div>

        {/* Overall score */}
        <div className="text-right shrink-0">
          {!hasEval ? (
            <span className="text-stone-300 text-sm">No evaluation</span>
          ) : (
            <>
              <p className={`text-2xl font-bold tabular-nums ${pctTextColor(overallPct)}`}>
                {overallPct !== null ? `${overallPct.toFixed(1)}%` : '-'}
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">Integration readiness</p>
            </>
          )}
        </div>
      </div>

      {/* Overall score bar */}
      {hasEval && overallPct !== null && (
        <div className="px-5 pb-3">
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pctColor(overallPct)}`}
              style={{ width: `${Math.min(100, overallPct)}%` }}
            />
          </div>
        </div>
      )}

      {/* Per-requirement breakdown */}
      {hasEval && scoredReqs.length > 0 && (
        <div className="border-t border-stone-100 px-5 py-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400 mb-3">
            Requirement breakdown
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {scoredReqs.map(r => (
              <div key={r.id}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11.5px] text-stone-600 truncate">{r.title}</span>
                  <span className={`text-[11.5px] tabular-nums font-semibold shrink-0 ${pctTextColor(r.pct)}`}>
                    {r.pct !== null ? `${r.pct.toFixed(0)}%` : '-'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pctColor(r.pct)}`}
                    style={{ width: r.pct !== null ? `${Math.min(100, r.pct)}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasEval && scoredReqs.length === 0 && (
        <div className="border-t border-stone-100 px-5 py-3 text-xs text-stone-400">
          No {BUILD_READINESS_CATEGORY} requirements scored for this platform.
        </div>
      )}
    </div>
  )
}
