import { prisma } from '@/lib/prisma'
import { loadToolScannerRequirements } from '@/lib/tool-scanner-context'
import { ScoringMatrix } from '@/components/tool-scanner/ScoringMatrix'

export default async function ScoringMatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>
}) {
  const sp = await searchParams
  const contextId = sp.context || null

  const [evaluations, { requirements }] = await Promise.all([
    prisma.searchEvaluation.findMany({ orderBy: { createdAt: 'desc' } }),
    loadToolScannerRequirements(contextId),
  ])

  const platforms = evaluations.map((ev) => ({
    id: ev.id,
    platformName: ev.platformName,
    scoresMap: ev.scores as Record<string, number>,
  }))

  const reqs = requirements.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category ?? 'General',
    weight: r.weight,
  }))

  return <ScoringMatrix platforms={platforms} requirements={reqs} />
}
