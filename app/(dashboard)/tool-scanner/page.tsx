import { prisma } from '@/lib/prisma'
import { coveragePercent } from '@/lib/screening'
import { ToolScannerDashboard, type ScanRow } from '@/components/tool-scanner/ToolScannerDashboard'

export default async function ToolScannerPage() {
  const evaluations = await prisma.searchEvaluation.findMany({
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

  return <ToolScannerDashboard initialRows={initialRows} />
}
