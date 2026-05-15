import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { calculateWeightedPercentage } from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'
import type { PlatformStatus } from '@prisma/client'

// ─── Build-readiness keyword groups ───────────────────────────────────────────

const KEYWORD_GROUPS = [
  { key: 'api',              label: 'API Integration' },
  { key: 'lti',              label: 'LTI' },
  { key: 'export',           label: 'Data Export' },
  { key: 'sso',              label: 'SSO / Auth' },
  { key: 'integration',      label: 'Integration' },
  { key: 'interoperability', label: 'Interoperability' },
] as const

type KwGroup = (typeof KEYWORD_GROUPS)[number]

function matchesGroup(category: string | null, kw: string): boolean {
  return category?.toLowerCase().includes(kw) ?? false
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toScoringReq(r: {
  id: string; weight: 'HIGH' | 'MEDIUM' | 'LOW'
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

type SubScore = {
  group: KwGroup
  pct: number | null
  reqCount: number
}

type PlatformReadiness = {
  platform: { id: string; name: string; vendor: string; status: PlatformStatus }
  hasEval: boolean
  overallPct: number | null
  totalReqCount: number
  subScores: SubScore[]
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

  const sp         = await searchParams
  const contextId  = typeof sp.context  === 'string' ? sp.context  : null
  const platformId = typeof sp.platform === 'string' ? sp.platform : null

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const [rawPlatforms, allRequirements, evaluations] = await Promise.all([
    prisma.platform.findMany({
      where: {
        ...(platformId && { id: platformId }),
        ...(contextId  && { contexts: { some: { contextId } } }),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, vendor: true, status: true },
    }),

    // Fetch only TECHNICAL requirements (build readiness = integration/technical capability)
    prisma.requirement.findMany({
      where: {
        evaluatorType: 'TECHNICAL',
        ...(contextId && { contexts: { some: { contextId } } }),
      },
      select: { id: true, weight: true, category: true, isComplianceGate: true },
    }),

    prisma.evaluation.findMany({
      where: { state: { in: ['FINALISED', 'MERGED'] } },
      select: {
        id: true, platformId: true, state: true, lockedAt: true,
        scores: { select: { requirementId: true, value: true, evidenceType: true } },
      },
    }),
  ])

  // ── Filter to build-readiness requirements ────────────────────────────────

  const buildReqs = allRequirements.filter(r =>
    r.category !== null &&
    KEYWORD_GROUPS.some(g => matchesGroup(r.category, g.key)),
  )

  // Pre-build per-group requirement sets
  const groupReqMap = new Map<string, typeof buildReqs>(
    KEYWORD_GROUPS.map(g => [
      g.key,
      buildReqs.filter(r => matchesGroup(r.category, g.key)),
    ]),
  )

  // Best eval per platform
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
        overallPct: null, totalReqCount: buildReqs.length,
        subScores: KEYWORD_GROUPS.map(g => ({
          group: g, pct: null, reqCount: groupReqMap.get(g.key)!.length,
        })),
      }
    }

    const scores     = ev.scores.map(toScore)
    const allBuildSR = buildReqs.map(toScoringReq)
    const overallPct = allBuildSR.length ? calculateWeightedPercentage(scores, allBuildSR) : null

    const subScores: SubScore[] = KEYWORD_GROUPS.map(g => {
      const groupReqs = groupReqMap.get(g.key)!.map(toScoringReq)
      return {
        group: g,
        reqCount: groupReqs.length,
        pct: groupReqs.length ? calculateWeightedPercentage(scores, groupReqs) : null,
      }
    })

    return {
      platform: p, hasEval: true,
      overallPct: overallPct ?? null,
      totalReqCount: buildReqs.length,
      subScores,
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
        <div className="mb-3 text-3xl text-stone-300">—</div>
        <p className="text-sm font-medium text-stone-500">No platforms match the current filters</p>
      </div>
    )
  }

  const hasAnyBuildReqs = buildReqs.length > 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Key */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-700">
            Build Readiness — Technical Integration Score
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            {hasAnyBuildReqs
              ? `${buildReqs.length} requirements matched across ${KEYWORD_GROUPS.filter(g => groupReqMap.get(g.key)!.length > 0).length} integration categories`
              : 'No technical requirements matched build-readiness keywords'
            }
          </p>
        </div>
        <div className="shrink-0 text-[11px] text-stone-400 text-right leading-relaxed">
          Categories matched: API, LTI, Data Export, SSO, Integration, Interoperability
        </div>
      </div>

      {!hasAnyBuildReqs && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-sm text-amber-700">
          No TECHNICAL requirements are categorised with API, LTI, SSO, export, integration, or
          interoperability keywords. Scores will show 0 until requirements are categorised.
        </div>
      )}

      {/* Ranked list */}
      <div className="space-y-3">
        {readiness.map((item, i) => (
          <ReadinessCard key={item.platform.id} item={item} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}

// ─── Platform readiness card ───────────────────────────────────────────────────

function ReadinessCard({ item, rank }: { item: PlatformReadiness; rank: number }) {
  const { platform: p, overallPct, hasEval, subScores } = item
  const isDQ = p.status === 'DISQUALIFIED'

  const activeSubScores = subScores.filter(s => s.reqCount > 0)

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
                {overallPct !== null ? `${overallPct.toFixed(1)}%` : '—'}
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">Overall readiness</p>
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

      {/* Sub-scores */}
      {hasEval && activeSubScores.length > 0 && (
        <div className="border-t border-stone-100 px-5 py-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400 mb-3">
            Category breakdown
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
            {activeSubScores.map(({ group, pct, reqCount }) => (
              <div key={group.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11.5px] text-stone-600 font-medium">{group.label}</span>
                  <span className={`text-[11.5px] tabular-nums font-semibold ${pctTextColor(pct)}`}>
                    {pct !== null ? `${pct.toFixed(0)}%` : '—'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pctColor(pct)}`}
                    style={{ width: pct !== null ? `${Math.min(100, pct)}%` : '0%' }}
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">{reqCount} req{reqCount !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasEval && activeSubScores.length === 0 && (
        <div className="border-t border-stone-100 px-5 py-3 text-xs text-stone-400">
          No requirements matched integration categories for this context filter.
        </div>
      )}
    </div>
  )
}
