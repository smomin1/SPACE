import { prisma } from '@/lib/prisma'
import { coveragePercent } from '@/lib/screening'
import { getToolScannerContext } from '@/lib/requirement-sets'
import { ToolScannerDashboard, type ScanRow } from '@/components/tool-scanner/ToolScannerDashboard'

export default async function ToolScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>
}) {
  const { set } = await searchParams
  const { sets, current } = await getToolScannerContext(set)

  if (!current) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/30 px-6 py-12 text-center text-[13px] text-stone-500">
        No requirement sets are configured yet. Ask an admin to create one under Requirement Sets.
      </div>
    )
  }

  const evaluations = await prisma.searchEvaluation.findMany({
    where: { requirementSetId: current.id },
    orderBy: { createdAt: 'desc' },
    include: { responses: { select: { answer: true } } },
  })

  const initialRows: ScanRow[] = evaluations.map((ev) => ({
    id: ev.id,
    platformName: ev.platformName,
    url: ev.url,
    status: ev.status,
    error: ev.error,
    coveragePct: coveragePercent(ev.responses),
    createdAt: ev.createdAt.toISOString(),
  }))

  return (
    <ToolScannerDashboard
      key={current.id}
      initialRows={initialRows}
      requirementSets={sets}
      activeRequirementSetId={current.id}
    />
  )
}
