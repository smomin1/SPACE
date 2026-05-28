import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { calculateWeightedPercentage } from '@/lib/scoring'
import type { Score } from '@/lib/scoring'
import { loadToolScannerRequirements } from '@/lib/tool-scanner-context'
import { ToolScannerForm } from '@/components/tool-scanner/ToolScannerForm'
import { DeleteToolScanButton } from '@/components/tool-scanner/DeleteToolScanButton'

export default async function ToolScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>
}) {
  const sp = await searchParams
  const contextId = sp.context || null

  const [evaluations, { scoringRequirements }] = await Promise.all([
    prisma.searchEvaluation.findMany({ orderBy: { createdAt: 'desc' } }),
    loadToolScannerRequirements(contextId),
  ])

  const reqIdSet = new Set(scoringRequirements.map((r) => r.id))

  const rows = evaluations.map((ev) => {
    const scoresJson = ev.scores as Record<string, number>
    // Only include scores for requirements that are in the current context scope
    const scores: Score[] = Object.entries(scoresJson)
      .filter(([requirementId]) => reqIdSet.has(requirementId))
      .map(([requirementId, value]) => ({
        requirementId,
        value: value as number,
        evidenceType: null,
      }))
    const overallPct = calculateWeightedPercentage(scores, scoringRequirements)
    return {
      id: ev.id,
      platformName: ev.platformName,
      url: ev.url,
      createdAt: ev.createdAt,
      overallPct,
    }
  })

  return (
    <div className="space-y-6">
      <ToolScannerForm />

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">
            Past evaluations
          </h2>
          <span className="font-mono text-[11px] tabular-nums uppercase tracking-wider text-stone-500">
            {rows.length} total
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/30 px-6 py-12 text-center">
            <p className="text-[13px] text-stone-500">
              No evaluations yet. Run your first one above.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-stone-200/80 bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-stone-50/60">
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                    Platform
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                    URL
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                    Overall %
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/40">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/tool-scanner/${row.id}`}
                        className="font-medium text-emerald-950 hover:text-emerald-800 hover:underline"
                      >
                        {row.platformName}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-stone-500">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-emerald-800"
                      >
                        {new URL(row.url).hostname}
                      </a>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-emerald-950">
                      {row.overallPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-stone-500">
                      {row.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DeleteToolScanButton id={row.id} platformName={row.platformName} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
