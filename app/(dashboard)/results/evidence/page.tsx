import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { PlatformStatus } from '@prisma/client'

// ─── Evidence quality cell ────────────────────────────────────────────────────

type EvidenceCell = {
  highCount: number
  totalCount: number
  pct: number | null
}

function cellBg(pct: number | null): string {
  if (pct === null) return 'bg-stone-50 text-stone-300'
  if (pct >= 80)   return 'bg-emerald-100 text-emerald-800'
  if (pct >= 60)   return 'bg-green-100 text-green-700'
  if (pct >= 40)   return 'bg-amber-100 text-amber-700'
  if (pct >= 20)   return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

const HIGH_EVIDENCE = new Set(['TRIAL', 'DEMO'])

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'view:results')) redirect('/dashboard')

  const sp             = await searchParams
  const contextId      = typeof sp.context       === 'string' ? sp.context       : null
  const platformId     = typeof sp.platform      === 'string' ? sp.platform      : null
  const categoryFilter = typeof sp.category      === 'string' ? sp.category      : null
  const evalTypeFilter = typeof sp.evaluatorType === 'string' ? sp.evaluatorType : null

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const [rawRequirements, rawPlatforms, evaluations] = await Promise.all([
    prisma.requirement.findMany({
      where: {
        ...(contextId      && { contexts: { some: { contextId } } }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(evalTypeFilter && { evaluatorType: evalTypeFilter as 'PEDAGOGY' | 'TECHNICAL' }),
      },
      select: { id: true, category: true },
      orderBy: { category: 'asc' },
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
        id: true, platformId: true, state: true,
        scores: {
          select: { requirementId: true, value: true, evidenceType: true },
        },
      },
    }),
  ])

  // ── Derive categories ──────────────────────────────────────────────────────

  const categories = [...new Set(rawRequirements.map(r => r.category ?? 'General'))].sort()
  const reqByCategory = new Map<string, Set<string>>()
  for (const r of rawRequirements) {
    const cat = r.category ?? 'General'
    if (!reqByCategory.has(cat)) reqByCategory.set(cat, new Set())
    reqByCategory.get(cat)!.add(r.id)
  }

  // Best eval per platform
  const evalByPlatform = new Map<string, (typeof evaluations)[number]>()
  for (const ev of evaluations) {
    const cur = evalByPlatform.get(ev.platformId)
    if (!cur || (ev.state === 'FINALISED' && cur.state !== 'FINALISED')) {
      evalByPlatform.set(ev.platformId, ev)
    }
  }

  // ── Build heatmap rows ────────────────────────────────────────────────────

  type HeatmapRow = {
    platform: { id: string; name: string; vendor: string; status: PlatformStatus }
    hasEval: boolean
    overall: EvidenceCell
    cells: EvidenceCell[]   // one per category, in order
  }

  const rows: HeatmapRow[] = rawPlatforms.map(p => {
    const ev = evalByPlatform.get(p.id)
    if (!ev) {
      return {
        platform: p, hasEval: false,
        overall: { highCount: 0, totalCount: 0, pct: null },
        cells: categories.map(() => ({ highCount: 0, totalCount: 0, pct: null })),
      }
    }

    function evidenceCell(reqIds: Set<string>): EvidenceCell {
      let highCount = 0, totalCount = 0
      for (const s of ev!.scores) {
        if (!reqIds.has(s.requirementId)) continue
        if (s.value === null) continue       // N/A — skip
        if (!s.evidenceType) continue        // no evidence type recorded
        totalCount++
        if (HIGH_EVIDENCE.has(s.evidenceType)) highCount++
      }
      return {
        highCount,
        totalCount,
        pct: totalCount === 0 ? null : (highCount / totalCount) * 100,
      }
    }

    const allReqIds = new Set(rawRequirements.map(r => r.id))
    const overall   = evidenceCell(allReqIds)
    const cells     = categories.map(cat => evidenceCell(reqByCategory.get(cat) ?? new Set()))

    return { platform: p, hasEval: true, overall, cells }
  })

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-3xl text-stone-300">—</div>
        <p className="text-sm font-medium text-stone-500">No platforms match the current filters</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Colour scale legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11.5px]">
        <span className="text-stone-500 font-medium">Evidence confidence:</span>
        {[
          { cls: 'bg-emerald-100', label: '≥ 80%' },
          { cls: 'bg-green-100',   label: '≥ 60%' },
          { cls: 'bg-amber-100',   label: '≥ 40%' },
          { cls: 'bg-orange-100',  label: '≥ 20%' },
          { cls: 'bg-red-100',     label: '< 20%' },
          { cls: 'bg-stone-50 border border-stone-200',   label: 'No data' },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm ${cls}`} />
            <span className="text-stone-600">{label}</span>
          </span>
        ))}
        <span className="ml-auto text-stone-400 text-[11px]">
          High-confidence = TRIAL or DEMO evidence
        </span>
      </div>

      {/* Heatmap table */}
      <div className="overflow-x-auto rounded-xl border border-stone-200/80 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200/80">
              {/* Platform column */}
              <th className="w-52 py-3 px-4 text-left bg-stone-50/60">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                  Platform
                </span>
              </th>

              {/* Overall */}
              <th className="py-3 px-3 text-center bg-stone-50/60 min-w-[100px]">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                  Overall
                </span>
              </th>

              {/* Per-category */}
              {categories.map(cat => (
                <th key={cat} className="py-3 px-3 text-center bg-stone-50/60 min-w-[110px]">
                  <span className="text-[10.5px] font-medium text-stone-500 leading-snug">
                    {cat}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map(row => (
              <tr
                key={row.platform.id}
                className={`border-b border-stone-100 last:border-0 ${
                  row.platform.status === 'DISQUALIFIED' ? 'opacity-60' : ''
                }`}
              >
                {/* Platform label */}
                <td className="py-3 px-4 align-middle">
                  <div>
                    <p className={`text-[12.5px] font-semibold ${
                      row.platform.status === 'DISQUALIFIED'
                        ? 'text-destructive/70 line-through'
                        : 'text-emerald-950'
                    }`}>
                      {row.platform.name}
                    </p>
                    <p className="text-[11px] text-stone-400">{row.platform.vendor}</p>
                  </div>
                </td>

                {/* Overall cell */}
                <td className="py-2 px-3 text-center">
                  {!row.hasEval ? (
                    <span className="text-stone-300 text-sm">—</span>
                  ) : (
                    <HeatCell cell={row.overall} />
                  )}
                </td>

                {/* Category cells */}
                {row.cells.map((cell, i) => (
                  <td key={i} className="py-2 px-3 text-center">
                    {!row.hasEval ? (
                      <span className="text-stone-300 text-sm">—</span>
                    ) : (
                      <HeatCell cell={cell} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-stone-400">
        Percentage of scored requirements backed by TRIAL or DEMO evidence.
        Scores with no evidence type recorded are excluded.
      </p>
    </div>
  )
}

// ─── Individual heatmap cell ───────────────────────────────────────────────────

function HeatCell({ cell }: { cell: EvidenceCell }) {
  if (cell.pct === null) {
    return (
      <div className="mx-auto inline-flex items-center justify-center rounded-lg px-2 py-1.5 min-w-[72px] bg-stone-50 text-stone-300 text-[12px]">
        —
      </div>
    )
  }

  return (
    <div
      title={`${cell.highCount} high-confidence / ${cell.totalCount} total`}
      className={`mx-auto inline-flex flex-col items-center justify-center rounded-lg px-2 py-1.5 min-w-[72px] ${cellBg(cell.pct)}`}
    >
      <span className="text-[13px] font-semibold tabular-nums">
        {cell.pct.toFixed(0)}%
      </span>
      <span className="text-[9.5px] opacity-70">
        {cell.highCount}/{cell.totalCount}
      </span>
    </div>
  )
}
