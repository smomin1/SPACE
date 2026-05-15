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
import type { EvaluatorType, EvaluationState, PlatformStatus } from '@prisma/client'

// ─── Types ─────────────────────────────────────────────────────────────────────

type PlatformMetric = {
  id: string
  name: string
  vendor: string
  status: PlatformStatus
  evalState: EvaluationState | null
  compliancePass: boolean | null   // null = no compliance gate requirements present
  pedagogyPct: number | null       // null = no evaluation / no requirements
  technicalPct: number | null
  combinedPct: number | null
  evidence: { high: number; low: number; percentage: number }
  recommendation: ReturnType<typeof getRecommendedAction> | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVIDENCE_HIGH = new Set(['TRIAL', 'DEMO'])
const EVIDENCE_LOW  = new Set(['DOCUMENTATION', 'VENDOR_CLAIM'])

function pctColor(pct: number): string {
  if (pct >= 85) return 'text-emerald-700 font-semibold'
  if (pct >= 70) return 'text-emerald-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function applyEvidenceFilter(
  scores: Score[],
  filter: string | null,
): Score[] {
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ComparisonPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'view:results')) redirect('/dashboard')

  const sp            = await searchParams
  const contextId     = typeof sp.context         === 'string' ? sp.context         : null
  const platformId    = typeof sp.platform        === 'string' ? sp.platform        : null
  const categoryFilter= typeof sp.category        === 'string' ? sp.category        : null
  const evalTypeFilter= typeof sp.evaluatorType   === 'string' ? sp.evaluatorType   : null
  const evidenceFilter= typeof sp.evidenceQuality === 'string' ? sp.evidenceQuality : null

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const [rawRequirements, rawPlatforms, evaluations] = await Promise.all([
    prisma.requirement.findMany({
      where: {
        ...(contextId  && { contexts: { some: { contextId } } }),
        ...(categoryFilter && { category: categoryFilter }),
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
        ...(platformId && { id: platformId }),
        ...(contextId  && { contexts: { some: { contextId } } }),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, vendor: true, status: true },
    }),

    prisma.evaluation.findMany({
      where: { state: { in: ['FINALISED', 'MERGED'] } },
      orderBy: { platform: { name: 'asc' } },
      select: {
        id: true,
        platformId: true,
        state: true,
        lockedAt: true,
        scores: {
          select: {
            requirementId: true,
            value: true,
            evidenceType: true,
          },
        },
      },
    }),
  ])

  // ── Requirement buckets (in-memory split) ──────────────────────────────────

  const complianceGateReqs = rawRequirements
    .filter(r => r.isComplianceGate)
    .map(toScoringReq)

  const pedagogyReqs = rawRequirements
    .filter(r => r.evaluatorType === 'PEDAGOGY' && (!evalTypeFilter || evalTypeFilter === 'PEDAGOGY'))
    .map(toScoringReq)

  const technicalReqs = rawRequirements
    .filter(r => r.evaluatorType === 'TECHNICAL' && (!evalTypeFilter || evalTypeFilter === 'TECHNICAL'))
    .map(toScoringReq)

  const combinedReqs = [...pedagogyReqs, ...technicalReqs]

  // Map: platformId → latest evaluation (prefer FINALISED over MERGED)
  const evalByPlatform = new Map<string, (typeof evaluations)[number]>()
  for (const ev of evaluations) {
    const existing = evalByPlatform.get(ev.platformId)
    if (!existing) { evalByPlatform.set(ev.platformId, ev); continue }
    // Prefer FINALISED; then prefer later lockedAt
    const betterState = ev.state === 'FINALISED' && existing.state !== 'FINALISED'
    if (betterState) { evalByPlatform.set(ev.platformId, ev) }
  }

  // ── Compute per-platform metrics ──────────────────────────────────────────

  const metrics: PlatformMetric[] = rawPlatforms.map(p => {
    const ev = evalByPlatform.get(p.id) ?? null

    if (!ev) {
      return {
        id: p.id, name: p.name, vendor: p.vendor, status: p.status,
        evalState: null,
        compliancePass: null,
        pedagogyPct: null, technicalPct: null, combinedPct: null,
        evidence: { high: 0, low: 0, percentage: 0 },
        recommendation: null,
      }
    }

    const allScores  = ev.scores.map(toScoringScore)
    const filtered   = applyEvidenceFilter(allScores, evidenceFilter)

    // Compliance gate: fail if any gate requirement has value === 0
    const cgPass = complianceGateReqs.length === 0
      ? null
      : !complianceGateReqs.some(r =>
          allScores.some(s => s.requirementId === r.id && s.value === 0),
        )

    const pPct = pedagogyReqs.length  ? calculateWeightedPercentage(filtered, pedagogyReqs)  : null
    const tPct = technicalReqs.length ? calculateWeightedPercentage(filtered, technicalReqs) : null
    const cPct = combinedReqs.length  ? calculateWeightedPercentage(filtered, combinedReqs)  : null

    const evidence = calculateEvidenceQuality(allScores)

    const rec = p.status === 'DISQUALIFIED'
      ? 'DISQUALIFIED' as const
      : cPct !== null ? getRecommendedAction(cPct) : null

    return {
      id: p.id, name: p.name, vendor: p.vendor, status: p.status,
      evalState: ev.state,
      compliancePass: cgPass,
      pedagogyPct: pPct, technicalPct: tPct, combinedPct: cPct,
      evidence,
      recommendation: rec,
    }
  })

  // ── Empty state ────────────────────────────────────────────────────────────

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-3xl text-stone-300">—</div>
        <p className="text-sm font-medium text-stone-500">No platforms match the current filters</p>
        <p className="text-xs text-stone-400 mt-1">
          Try adjusting the context or platform filter above
        </p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return <ComparisonTable metrics={metrics} />
}

// ─── Presentational component (no 'use client' needed) ────────────────────────

function ComparisonTable({ metrics }: { metrics: PlatformMetric[] }) {
  const ROWS = [
    { key: 'compliance', label: 'Compliance Gate', sub: 'Pass / Fail' },
    { key: 'pedagogy',   label: 'Pedagogy',        sub: 'Weighted %' },
    { key: 'technical',  label: 'Technical',        sub: 'Weighted %' },
    { key: 'combined',   label: 'Combined',         sub: 'Pedagogy + Technical' },
    { key: 'evidence',   label: 'Evidence Quality', sub: '% high-confidence' },
    { key: 'action',     label: 'Recommendation',   sub: '' },
  ] as const

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200/80 bg-white">
      <table className="w-full text-sm border-collapse">
        {/* Header — platform names */}
        <thead>
          <tr className="border-b border-stone-200/80">
            {/* Metric label column */}
            <th className="w-44 py-3 px-4 text-left align-bottom bg-stone-50/60">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                Metric
              </span>
            </th>

            {metrics.map(m => (
              <th
                key={m.id}
                className={`py-3 px-4 text-left align-bottom min-w-[160px] ${
                  m.status === 'DISQUALIFIED' ? 'bg-destructive/5' : 'bg-stone-50/60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`text-[13px] font-semibold leading-tight ${
                      m.status === 'DISQUALIFIED' ? 'text-destructive line-through' : 'text-emerald-950'
                    }`}>
                      {m.name}
                    </span>
                    {m.status === 'DISQUALIFIED' && (
                      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive ring-1 ring-inset ring-destructive/20">
                        DQ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 font-normal">{m.vendor}</p>
                  {m.evalState && (
                    <span className={`inline-block text-[10px] font-medium ${
                      m.evalState === 'FINALISED' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {m.evalState === 'FINALISED' ? '● Finalised' : '● Merged'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {ROWS.map(row => (
            <tr key={row.key} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/40">
              {/* Metric label */}
              <td className="py-3 px-4 align-top">
                <p className="text-[12.5px] font-medium text-stone-700">{row.label}</p>
                {row.sub && <p className="text-[11px] text-stone-400 mt-0.5">{row.sub}</p>}
              </td>

              {metrics.map(m => (
                <td
                  key={m.id}
                  className={`py-3 px-4 align-top ${
                    m.status === 'DISQUALIFIED' ? 'bg-destructive/[0.03]' : ''
                  }`}
                >
                  <MetricCell row={row.key} metric={m} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MetricCell({
  row,
  metric: m,
}: {
  row: string
  metric: PlatformMetric
}) {
  if (m.evalState === null) {
    return <span className="text-stone-300 text-sm">—</span>
  }

  if (m.status === 'DISQUALIFIED' && row !== 'compliance') {
    return <span className="text-destructive/50 text-xs italic">disqualified</span>
  }

  if (row === 'compliance') {
    if (m.compliancePass === null) {
      return <span className="text-stone-300 text-xs">No gates</span>
    }
    return m.compliancePass
      ? (
        <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium">
          <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"/>
          </svg>
          Pass
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-destructive text-sm font-medium">
          <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z"/>
          </svg>
          Fail
        </span>
      )
  }

  if (row === 'pedagogy') {
    if (m.pedagogyPct === null) return <span className="text-stone-300 text-sm">—</span>
    return <span className={`text-sm tabular-nums ${pctColor(m.pedagogyPct)}`}>{m.pedagogyPct.toFixed(1)}%</span>
  }

  if (row === 'technical') {
    if (m.technicalPct === null) return <span className="text-stone-300 text-sm">—</span>
    return <span className={`text-sm tabular-nums ${pctColor(m.technicalPct)}`}>{m.technicalPct.toFixed(1)}%</span>
  }

  if (row === 'combined') {
    if (m.combinedPct === null) return <span className="text-stone-300 text-sm">—</span>
    return (
      <div className="space-y-1">
        <span className={`text-sm tabular-nums ${pctColor(m.combinedPct)}`}>
          {m.combinedPct.toFixed(1)}%
        </span>
        <div className="h-1.5 w-20 rounded-full bg-stone-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              m.combinedPct >= 85 ? 'bg-emerald-600' :
              m.combinedPct >= 70 ? 'bg-emerald-500' :
              m.combinedPct >= 50 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${Math.min(100, m.combinedPct)}%` }}
          />
        </div>
      </div>
    )
  }

  if (row === 'evidence') {
    const { percentage, high, low } = m.evidence
    const total = high + low
    if (total === 0) return <span className="text-stone-300 text-sm">—</span>
    return (
      <div className="space-y-0.5">
        <span className={`text-sm tabular-nums ${pctColor(percentage)}`}>
          {percentage.toFixed(0)}%
        </span>
        <p className="text-[11px] text-stone-400">
          {high} high · {low} low
        </p>
      </div>
    )
  }

  if (row === 'action') {
    if (m.recommendation === null) return <span className="text-stone-300 text-sm">—</span>
    return <RecommendationBadge action={m.recommendation} />
  }

  return null
}

function RecommendationBadge({
  action,
}: {
  action: NonNullable<PlatformMetric['recommendation']>
}) {
  const cfg = {
    TOP_PICK:      { label: 'Top Pick',      cls: 'bg-emerald-600 text-white' },
    RECOMMENDED:   { label: 'Recommended',   cls: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/60' },
    CONSIDER:      { label: 'Consider',      cls: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300/60' },
    DISQUALIFIED:  { label: 'Disqualified',  cls: 'bg-destructive/10 text-destructive ring-1 ring-destructive/20' },
  } as const

  const { label, cls } = cfg[action]

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}
