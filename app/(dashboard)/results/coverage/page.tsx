import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { calculateWeightedPercentage } from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'
import type { PlatformStatus } from '@prisma/client'
import { FullscreenWrapper } from '@/components/ui/fullscreen-wrapper'

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

const THRESHOLD = 70  // min score to be considered "covered"

// ─── Cell state ───────────────────────────────────────────────────────────────

type CellState =
  | { kind: 'no-eval' }
  | { kind: 'scored'; pct: number }

function cellClasses(cell: CellState): string {
  if (cell.kind === 'no-eval')        return 'bg-stone-100 text-stone-400'
  const { pct } = cell
  if (pct >= 85) return 'bg-emerald-100 text-emerald-800'
  if (pct >= THRESHOLD) return 'bg-green-100 text-green-700'
  if (pct >= 50) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CoveragePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'view:results')) redirect('/dashboard')

  const sp          = await searchParams
  const platformIds = (typeof sp.platform === 'string' ? sp.platform : '').split(',').filter(Boolean)
  const statuses    = (typeof sp.status   === 'string' ? sp.status   : 'FINALISED').split(',').filter(Boolean)
  const showDq      = sp.showDq === '1'

  // ── Fetch - always show full matrix, ignore context filter ─────────────────

  const [allContexts, allPlatforms, allRequirements, evaluations] = await Promise.all([
    prisma.context.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true,
        requirements: { select: { requirementId: true } },
      },
    }),

    prisma.platform.findMany({
      where: {
        ...(platformIds.length > 0 && { id: { in: platformIds } }),
        ...(!showDq                && { status: { not: 'DISQUALIFIED' } }),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, status: true },
    }),

    prisma.requirement.findMany({
      where: { evaluatorType: { not: 'COMPLIANCE' } },
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

  // Best eval per platform
  const evalByPlatform = new Map<string, (typeof evaluations)[number]>()
  for (const ev of evaluations) {
    const cur = evalByPlatform.get(ev.platformId)
    if (!cur || (ev.state === 'FINALISED' && cur.state !== 'FINALISED')) {
      evalByPlatform.set(ev.platformId, ev)
    }
  }

  // ── Build matrix ──────────────────────────────────────────────────────────

  type MatrixRow = {
    contextId: string
    contextName: string
    cells: { platformId: string; state: CellState }[]
    hasCoverage: boolean   // at least one platform ≥ threshold
  }

  const matrix: MatrixRow[] = allContexts.map(ctx => {
    const ctxReqIds = new Set(ctx.requirements.map(r => r.requirementId))
    const ctxReqs   = allRequirements.filter(r => ctxReqIds.has(r.id)).map(toScoringReq)

    let hasCoverage = false

    const cells = allPlatforms.map(p => {
      const ev = evalByPlatform.get(p.id)
      if (!ev) {
        return { platformId: p.id, state: { kind: 'no-eval' } as CellState }
      }

      const scores = ev.scores.map(toScore)
      const pct    = ctxReqs.length ? calculateWeightedPercentage(scores, ctxReqs) : 0

      if (pct >= THRESHOLD) hasCoverage = true

      return { platformId: p.id, state: { kind: 'scored', pct } as CellState }
    })

    return { contextId: ctx.id, contextName: ctx.name, cells, hasCoverage }
  })

  if (allPlatforms.length === 0 || allContexts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-3xl text-stone-300">-</div>
        <p className="text-sm font-medium text-stone-500">No platforms or contexts to display</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <FullscreenWrapper title="Coverage Matrix">
    <div className="space-y-5">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11.5px]">
        <span className="text-stone-500 font-medium">Coverage:</span>
        {[
          { cls: 'bg-emerald-100 text-emerald-800', label: '≥ 85%' },
          { cls: 'bg-green-100 text-green-700',     label: `≥ ${THRESHOLD}%` },
          { cls: 'bg-amber-100 text-amber-700',     label: '≥ 50%' },
          { cls: 'bg-red-100 text-red-700',         label: `< 50%` },
          { cls: 'bg-stone-100 text-stone-400',     label: 'No eval' },
          { cls: 'bg-stone-50 text-stone-300',      label: 'Not assigned' },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm ${cls.split(' ')[0]}`} />
            <span className="text-stone-600">{label}</span>
          </span>
        ))}
        <span className="ml-auto text-stone-400">
          Gap threshold: {THRESHOLD}%
        </span>
      </div>

      {/* Scrollable matrix */}
      <div className="overflow-x-auto rounded-xl border border-stone-200/80 bg-white">
        <table className="w-full border-collapse text-sm">
          {/* Platform name headers */}
          <thead>
            <tr className="border-b border-stone-200/80">
              <th className="w-52 py-3 px-4 text-left bg-stone-50/60">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                  Context
                </span>
              </th>
              {allPlatforms.map(p => (
                <th key={p.id} className="py-3 px-3 text-center bg-stone-50/60 min-w-[140px]">
                  <div className="space-y-0.5">
                    <p className={`text-[12px] font-semibold ${
                      p.status === 'DISQUALIFIED' ? 'text-destructive/60 line-through' : 'text-emerald-950'
                    }`}>
                      {p.name}
                    </p>
                    {p.status === 'DISQUALIFIED' && (
                      <span className="inline-block text-[9px] font-semibold text-destructive">DQ</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {matrix.map(row => (
              <tr key={row.contextId} className="border-b border-stone-100 last:border-0">
                {/* Context label */}
                <td className="py-3 px-4 align-middle">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-medium text-stone-700">{row.contextName}</span>
                    {!row.hasCoverage && (
                      <span
                        title="No platform meets the coverage threshold for this context"
                        className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[9.5px] font-semibold text-amber-700 ring-1 ring-amber-300/50"
                      >
                        Gap
                      </span>
                    )}
                  </div>
                </td>

                {/* Cells */}
                {row.cells.map(({ platformId: pid, state }) => (
                  <td key={pid} className="py-2 px-3 text-center">
                    <div className={`mx-auto inline-flex items-center justify-center rounded-lg px-3 py-1.5 min-w-[72px] text-[12.5px] font-medium tabular-nums ${cellClasses(state)}`}>
                      {state.kind === 'no-eval' && (
                        <span className="text-[11px]">No eval</span>
                      )}
                      {state.kind === 'scored' && `${state.pct.toFixed(1)}%`}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-stone-400">
        Scores computed using requirements assigned to each context. Platforms not assigned to a context show -.
      </p>
    </div>
    </FullscreenWrapper>
  )
}
