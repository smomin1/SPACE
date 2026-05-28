import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculateWeightedPercentage } from '@/lib/scoring'
import type { Score } from '@/lib/scoring'
import { loadToolScannerRequirements } from '@/lib/tool-scanner-context'
import { ToolScannerScoreBadge } from '@/components/tool-scanner/ToolScannerScoreBadge'
import { WeightTier, ComplianceGateBadge } from '@/components/admin/_shared/badges'
import { CategoryChart } from '@/components/tool-scanner/CategoryChart'
import { GlobeIcon, CalendarIcon, AlertTriangleIcon } from 'lucide-react'

export default async function ToolScannerResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ context?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const contextId = sp.context || null

  const [evaluation, { requirements, scoringRequirements }] = await Promise.all([
    prisma.searchEvaluation.findUnique({ where: { id } }),
    loadToolScannerRequirements(contextId),
  ])

  if (!evaluation) notFound()

  const scoresJson = evaluation.scores as Record<string, number>
  const metadata = evaluation.metadata as {
    Target_Audience?: string
    Fluency_Levels?: string[]
    Grade_Levels?: string[]
  } | null

  const reqIdSet = new Set(scoringRequirements.map((r) => r.id))
  const scores: Score[] = Object.entries(scoresJson)
    .filter(([requirementId]) => reqIdSet.has(requirementId))
    .map(([requirementId, value]) => ({
      requirementId,
      value: value as number,
      evidenceType: null,
    }))

  const overallPct = calculateWeightedPercentage(scores, scoringRequirements)

  // Build per-category breakdown (using context-overridden weights)
  const categoryMap = new Map<string, { total: number; max: number }>()
  for (const r of requirements) {
    const cat = r.category ?? 'General'
    const val = scoresJson[r.id] ?? 0
    const m = ({ HIGH: 3, MEDIUM: 2, LOW: 1 } as Record<string, number>)[r.weight] ?? 1
    const entry = categoryMap.get(cat) ?? { total: 0, max: 0 }
    entry.total += val * m
    entry.max += 4 * m
    categoryMap.set(cat, entry)
  }
  const categoryData = Array.from(categoryMap.entries())
    .map(([category, { total, max }]) => ({
      category,
      pct: max === 0 ? 0 : (total / max) * 100,
    }))
    .sort((a, b) => b.pct - a.pct)

  // Compliance gate failures (score 0-1 on a compliance gate requirement, within the context scope)
  const complianceGateFailures = requirements.filter(
    (r) => r.isComplianceGate && (scoresJson[r.id] ?? 0) <= 1,
  )

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-[24px] tracking-tight text-emerald-950">
              {evaluation.platformName}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] text-stone-500">
              <a
                href={evaluation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-emerald-800"
              >
                <GlobeIcon className="size-3.5" />
                {new URL(evaluation.url).hostname}
              </a>
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                {evaluation.createdAt.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-serif text-[32px] tracking-tight tabular-nums text-emerald-950">
              {overallPct.toFixed(1)}%
            </div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-800/70">
              Overall Weighted
            </p>
          </div>
        </div>

        {metadata && (
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-stone-200/60 pt-4 text-[12.5px]">
            {metadata.Target_Audience && (
              <div>
                <span className="font-medium text-stone-500">Audience:</span>{' '}
                <span className="text-emerald-950">{metadata.Target_Audience}</span>
              </div>
            )}
            {Array.isArray(metadata.Grade_Levels) && metadata.Grade_Levels.length > 0 && (
              <div>
                <span className="font-medium text-stone-500">Grades:</span>{' '}
                <span className="text-emerald-950">{metadata.Grade_Levels.join(', ')}</span>
              </div>
            )}
            {Array.isArray(metadata.Fluency_Levels) && metadata.Fluency_Levels.length > 0 && (
              <div>
                <span className="font-medium text-stone-500">Fluency:</span>{' '}
                <span className="text-emerald-950">{metadata.Fluency_Levels.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {complianceGateFailures.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg bg-amber-50/60 px-4 py-3 ring-1 ring-amber-700/20">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-800" />
          <div>
            <p className="text-[13px] font-semibold text-amber-900">
              Potential compliance blockers ({complianceGateFailures.length})
            </p>
            <p className="mt-0.5 text-[12.5px] text-amber-900/85">
              The following compliance-gate requirements scored 0. These would
              disqualify the platform in a formal Tool Evaluator review:
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[12.5px] text-amber-900/85">
              {complianceGateFailures.map((r) => (
                <li key={r.id}>{r.title}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Category breakdown chart */}
      {categoryData.length > 0 && (
        <div className="rounded-xl border border-stone-200/80 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-serif text-[18px] tracking-tight text-emerald-950">
            Category breakdown
          </h3>
          <CategoryChart data={categoryData} />
        </div>
      )}

      {/* Requirement table */}
      <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-sm">
        <div className="border-b border-stone-200/60 px-6 py-4">
          <h3 className="font-serif text-[18px] tracking-tight text-emerald-950">
            All requirements
          </h3>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-stone-50/60">
              <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                Category
              </th>
              <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                Requirement
              </th>
              <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                Weight
              </th>
              <th className="px-3 py-2.5 text-center text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/60">
            {requirements.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50/30">
                <td className="px-3 py-2.5 text-stone-600">{r.category ?? '-'}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-950">{r.title}</span>
                    {r.isComplianceGate && <ComplianceGateBadge />}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <WeightTier value={r.weight} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <ToolScannerScoreBadge value={scoresJson[r.id] ?? 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
