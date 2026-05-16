import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  calculateWeightedPercentage,
  calculateEvidenceQuality,
  getRecommendedAction,
} from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'
import type { PlatformStatus } from '@prisma/client'
import { FullscreenWrapper } from '@/components/ui/fullscreen-wrapper'

// ─── Helpers (shared pattern) ─────────────────────────────────────────────────

const EVIDENCE_HIGH = new Set(['TRIAL', 'DEMO'])
const EVIDENCE_LOW  = new Set(['DOCUMENTATION', 'VENDOR_CLAIM'])

function applyEvidenceFilter(scores: Score[], filter: string | null): Score[] {
  if (!filter) return scores
  if (filter === 'high') return scores.filter(s => s.evidenceType && EVIDENCE_HIGH.has(s.evidenceType))
  if (filter === 'low')  return scores.filter(s => s.evidenceType && EVIDENCE_LOW.has(s.evidenceType))
  return scores
}

function toScoringReq(r: {
  id: string; weight: 'HIGH' | 'MEDIUM' | 'LOW'
  category: string | null; isComplianceGate: boolean
}): Requirement {
  return { ...r, contextIds: [] }
}

function toScore(s: { requirementId: string; value: number | null; evidenceType: string | null }): Score {
  return { requirementId: s.requirementId, value: s.value, evidenceType: s.evidenceType as Score['evidenceType'] }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type PlatformResult = {
  id: string; name: string; vendor: string; status: PlatformStatus
  pct: number | null; hasEval: boolean
  topCategories: { category: string; pct: number }[]
  gapCategories: { category: string; pct: number }[]
  evidence: ReturnType<typeof calculateEvidenceQuality>
}

type ContextCard = {
  contextId: string; contextName: string; description: string | null
  winner: PlatformResult | null
  runners: PlatformResult[]       // 2nd & 3rd
  allPlatforms: PlatformResult[]  // for "all platforms" collapse
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
  const contextIds      = (typeof sp.context         === 'string' ? sp.context         : '').split(',').filter(Boolean)
  const platformIds     = (typeof sp.platform        === 'string' ? sp.platform        : '').split(',').filter(Boolean)
  const categoryFilters = (typeof sp.category        === 'string' ? sp.category        : '').split(',').filter(Boolean)
  const evalTypeFilter  = typeof sp.evaluatorType   === 'string' ? sp.evaluatorType   : null
  const evidenceFilter  = typeof sp.evidenceQuality === 'string' ? sp.evidenceQuality : null
  const statuses        = (typeof sp.status === 'string' ? sp.status : 'FINALISED').split(',').filter(Boolean)
  const showDq          = sp.showDq === '1'

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const [contexts, allPlatforms, allRequirements, evaluations] = await Promise.all([
    prisma.context.findMany({
      where: contextIds.length > 0 ? { id: { in: contextIds } } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, description: true,
        requirements: { select: { requirementId: true } },
        platforms: { select: { platformId: true } },
      },
    }),

    prisma.platform.findMany({
      where: {
        ...(platformIds.length > 0 && { id: { in: platformIds } }),
        ...(!showDq                && { status: { not: 'DISQUALIFIED' } }),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, vendor: true, status: true },
    }),

    prisma.requirement.findMany({
      where: {
        evaluatorType: { not: 'COMPLIANCE' },
        ...(categoryFilters.length > 0 && { category: { in: categoryFilters } }),
        ...(evalTypeFilter             && { evaluatorType: evalTypeFilter as 'PEDAGOGY' | 'TECHNICAL' }),
      },
      select: { id: true, weight: true, category: true, isComplianceGate: true },
    }),

    prisma.evaluation.findMany({
      where: { state: { in: statuses as ('FINALISED' | 'MERGED' | 'IN_PROGRESS')[] } },
      select: {
        id: true, platformId: true, state: true, lockedAt: true,
        scores: { select: { requirementId: true, value: true, evidenceType: true } },
      },
    }),
  ])

  // Best evaluation per platform
  const evalByPlatform = new Map<string, (typeof evaluations)[number]>()
  for (const ev of evaluations) {
    const cur = evalByPlatform.get(ev.platformId)
    if (!cur || (ev.state === 'FINALISED' && cur.state !== 'FINALISED')) {
      evalByPlatform.set(ev.platformId, ev)
    }
  }

  // All unique categories (from filtered requirements)
  const allCategories = [...new Set(allRequirements.map(r => r.category ?? 'General'))].sort()

  // Compute metrics for a platform given a specific set of requirements
  function computePlatformResult(
    p: typeof allPlatforms[number],
    contextReqs: typeof allRequirements,
  ): PlatformResult {
    const ev = evalByPlatform.get(p.id)
    if (!ev) {
      return {
        id: p.id, name: p.name, vendor: p.vendor, status: p.status,
        pct: null, hasEval: false,
        topCategories: [], gapCategories: [], evidence: { high: 0, low: 0, percentage: 0 },
      }
    }

    const rawScores  = ev.scores.map(toScore)
    const scores     = applyEvidenceFilter(rawScores, evidenceFilter)
    const scoringReqs = contextReqs.map(toScoringReq)
    const pct        = scoringReqs.length ? calculateWeightedPercentage(scores, scoringReqs) : null

    // Per-category breakdown (within this context's requirements)
    const catData = allCategories.map(cat => {
      const catReqs = contextReqs.filter(r => (r.category ?? 'General') === cat).map(toScoringReq)
      if (!catReqs.length) return null
      const catPct = calculateWeightedPercentage(scores, catReqs)
      return { category: cat, pct: catPct }
    }).filter((c): c is { category: string; pct: number } => c !== null)

    const sorted        = [...catData].sort((a, b) => b.pct - a.pct)
    const topCategories = sorted.slice(0, 3).filter(c => c.pct > 0)
    const gapCategories = sorted.slice(-3).reverse().filter(c => c.pct < 85)

    return {
      id: p.id, name: p.name, vendor: p.vendor, status: p.status,
      pct: pct ?? null, hasEval: true,
      topCategories, gapCategories,
      evidence: calculateEvidenceQuality(rawScores),
    }
  }

  // ── Build context cards ────────────────────────────────────────────────────

  const cards: ContextCard[] = contexts.map(ctx => {
    const ctxReqIds   = new Set(ctx.requirements.map(r => r.requirementId))
    const ctxPlatIds  = new Set(ctx.platforms.map(p => p.platformId))
    const ctxReqs     = allRequirements.filter(r => ctxReqIds.has(r.id))
    const ctxPlats    = allPlatforms.filter(p => ctxPlatIds.has(p.id))

    const results = ctxPlats
      .map(p => computePlatformResult(p, ctxReqs))
      .filter(r => r.status === 'ACTIVE')   // exclude DQ from ranking
      .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))

    return {
      contextId: ctx.id, contextName: ctx.name, description: ctx.description,
      winner: results[0] ?? null,
      runners: results.slice(1, 3),
      allPlatforms: results,
    }
  })

  const noData = cards.every(c => c.winner === null)

  if (cards.length === 0) {
    return (
      <EmptyState message="No contexts found" hint="Create a context in admin settings first." />
    )
  }

  if (noData) {
    return (
      <EmptyState
        message="No finalised evaluations yet"
        hint="Platforms need a finalised evaluation before they appear here."
      />
    )
  }

  return (
    <FullscreenWrapper title="Best Fit">
    <div className="space-y-8">
      {cards.map(card => <ContextCard key={card.contextId} card={card} />)}
    </div>
    </FullscreenWrapper>
  )
}

// ─── Context card ──────────────────────────────────────────────────────────────

function ContextCard({ card }: { card: ContextCard }) {
  const { winner, runners, contextName, description } = card

  return (
    <section className="space-y-3">
      {/* Context heading */}
      <div className="flex items-baseline gap-3">
        <h2 className="text-base font-semibold text-emerald-950">{contextName}</h2>
        {description && (
          <span className="text-xs text-stone-400 truncate max-w-xs">{description}</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Winner - full-width left column */}
        {winner ? (
          <div className="lg:col-span-2 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    Best Fit
                  </span>
                </div>
                <h3 className="text-xl font-bold text-emerald-950">{winner.name}</h3>
                <p className="text-sm text-stone-500 mt-0.5">{winner.vendor}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-bold tabular-nums text-emerald-800">
                  {winner.pct !== null ? `${winner.pct.toFixed(1)}%` : '-'}
                </p>
                {winner.pct !== null && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {getRecommendedAction(winner.pct).replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            </div>

            {/* Score bar */}
            {winner.pct !== null && (
              <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${Math.min(100, winner.pct)}%` }}
                />
              </div>
            )}

            {/* Categories */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              {winner.topCategories.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400 mb-2">
                    Strengths
                  </p>
                  <ul className="space-y-1.5">
                    {winner.topCategories.map(c => (
                      <li key={c.category} className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] text-stone-700 truncate">{c.category}</span>
                        <span className="text-[12px] tabular-nums text-emerald-700 font-medium shrink-0">
                          {c.pct.toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {winner.gapCategories.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400 mb-2">
                    Gaps
                  </p>
                  <ul className="space-y-1.5">
                    {winner.gapCategories.map(c => (
                      <li key={c.category} className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] text-stone-700 truncate">{c.category}</span>
                        <span className={`text-[12px] tabular-nums font-medium shrink-0 ${
                          c.pct < 50 ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {c.pct.toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Evidence quality */}
            <EvidenceBar evidence={winner.evidence} />
          </div>
        ) : (
          <div className="lg:col-span-2 rounded-xl border border-stone-200/60 bg-stone-50/40 p-5 flex items-center justify-center text-stone-400 text-sm">
            No scored platform in this context
          </div>
        )}

        {/* Runner-ups */}
        <div className="space-y-3">
          {runners.map((r, i) => (
            <RunnerCard key={r.id} platform={r} rank={i + 2} />
          ))}
          {runners.length === 0 && (
            <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-4 text-stone-300 text-sm text-center">
              No runners-up
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function RunnerCard({
  platform: p,
  rank,
}: {
  platform: PlatformResult
  rank: number
}) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-medium text-stone-400 tabular-nums shrink-0">
            #{rank}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-stone-800 truncate">{p.name}</p>
            <p className="text-[11px] text-stone-400">{p.vendor}</p>
          </div>
        </div>
        <span className={`text-sm font-bold tabular-nums shrink-0 ${
          (p.pct ?? 0) >= 70 ? 'text-emerald-700' :
          (p.pct ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'
        }`}>
          {p.pct !== null ? `${p.pct.toFixed(1)}%` : '-'}
        </span>
      </div>
      {p.pct !== null && (
        <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-stone-400"
            style={{ width: `${Math.min(100, p.pct)}%` }}
          />
        </div>
      )}
    </div>
  )
}

function EvidenceBar({ evidence }: { evidence: ReturnType<typeof calculateEvidenceQuality> }) {
  const { high, low, percentage } = evidence
  const total = high + low
  if (total === 0) return null

  const label =
    percentage >= 75 ? 'High quality evidence' :
    percentage >= 50 ? 'Mixed evidence quality' :
    'Low quality evidence'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-stone-400">
        <span>Evidence quality</span>
        <span className="tabular-nums">{percentage.toFixed(0)}% high-confidence</span>
      </div>
      <div className="h-1.5 flex rounded-full overflow-hidden gap-px">
        <div
          className="bg-emerald-400 rounded-l-full"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="bg-stone-200 flex-1 rounded-r-full"
        />
      </div>
      <p className="text-[10.5px] text-stone-400">{label} · {high} trial/demo · {low} docs/claims</p>
    </div>
  )
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-3 text-3xl text-stone-300">-</div>
      <p className="text-sm font-medium text-stone-500">{message}</p>
      <p className="text-xs text-stone-400 mt-1">{hint}</p>
    </div>
  )
}
