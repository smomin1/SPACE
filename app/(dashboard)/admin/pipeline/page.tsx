import { redirect } from 'next/navigation'
import { GitBranchIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { syncAllPipelines, getOrCreateConfig } from '@/lib/pipeline-server'
import { STAGE_ORDER, thresholdFor, aggregateFromScores, type StageScoreMap } from '@/lib/pipeline'
import { PipelineBoard, type PipelineRow } from '@/components/pipeline/PipelineBoard'
import type { PipelineStage } from '@prisma/client'

export default async function PipelinePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:platform')) redirect('/dashboard')

  // Recompute the chain from current source data so the board (and auto-queueing)
  // always reflect the latest evaluations.
  await syncAllPipelines()

  const [config, platforms, unlinkedScans, unlinkedVitalTools] = await Promise.all([
    getOrCreateConfig(),
    prisma.platform.findMany({
      where: { status: { not: 'DISQUALIFIED' } },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        vendor: true,
        pipelineStages: { select: { stage: true, status: true, score: true } },
      },
    }),
    prisma.searchEvaluation.findMany({
      where: { platformId: null, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, platformName: true, url: true },
    }),
    prisma.vitalTool.findMany({
      where: { platformId: null, v2Percent: { not: null } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, v2Percent: true },
    }),
  ])

  const rows: PipelineRow[] = platforms.map((p) => {
    const byStage = new Map(p.pipelineStages.map((s) => [s.stage, s]))
    const scoreMap = Object.fromEntries(
      STAGE_ORDER.map((st) => [st, byStage.get(st)?.score ?? null]),
    ) as StageScoreMap
    const stages = STAGE_ORDER.map((st) => ({
      stage: st,
      status: byStage.get(st)?.status ?? 'NOT_STARTED',
      score: byStage.get(st)?.score ?? null,
      threshold: thresholdFor(config, st as PipelineStage),
    }))
    const complete = stages.every((s) => s.status === 'PASSED' || s.status === 'SKIPPED')
    return {
      platformId: p.id,
      name: p.name,
      vendor: p.vendor,
      stages,
      aggregate: aggregateFromScores(scoreMap, config),
      complete,
    }
  })

  return (
    <div>
      <PageHeader icon={GitBranchIcon} kicker="Orchestration" title="Evaluation Pipeline" />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <PipelineBoard rows={rows} config={config} unlinkedScans={unlinkedScans} unlinkedVitalTools={unlinkedVitalTools} />
      </main>
    </div>
  )
}
