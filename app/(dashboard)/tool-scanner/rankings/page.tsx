import { prisma } from '@/lib/prisma'
import { calculateWeightedPercentage } from '@/lib/scoring'
import type { Score } from '@/lib/scoring'
import { loadToolScannerRequirements } from '@/lib/tool-scanner-context'
import { RankingsView } from '@/components/tool-scanner/RankingsView'

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>
}) {
  const sp = await searchParams
  const contextId = sp.context || null

  const [evaluations, { scoringRequirements, requirements }] = await Promise.all([
    prisma.searchEvaluation.findMany({ orderBy: { createdAt: 'desc' } }),
    loadToolScannerRequirements(contextId),
  ])

  const reqIdSet = new Set(scoringRequirements.map((r) => r.id))

  const allCategories = Array.from(
    new Set(requirements.map((r) => r.category).filter((c): c is string => !!c)),
  ).sort()

  const data = evaluations.map((ev) => {
    const scoresJson = ev.scores as Record<string, number>
    const scores: Score[] = Object.entries(scoresJson)
      .filter(([requirementId]) => reqIdSet.has(requirementId))
      .map(([requirementId, value]) => ({
        requirementId,
        value: value as number,
        evidenceType: null,
      }))
    const overallPct = calculateWeightedPercentage(scores, scoringRequirements)

    // Per-category percentage (scoped to the context if one is active)
    const categoryPct: Record<string, number> = {}
    for (const cat of allCategories) {
      const catReqs = scoringRequirements.filter((r) => r.category === cat)
      const catScores = scores.filter((s) =>
        catReqs.some((r) => r.id === s.requirementId),
      )
      categoryPct[cat] = calculateWeightedPercentage(catScores, catReqs)
    }

    const md = ev.metadata as {
      Target_Audience?: string
      Fluency_Levels?: string[]
      Grade_Levels?: string[]
    } | null

    return {
      id: ev.id,
      platformName: ev.platformName,
      url: ev.url,
      overallPct,
      categoryPct,
      audience: md?.Target_Audience ?? '',
      fluency: md?.Fluency_Levels ?? [],
      grades: md?.Grade_Levels ?? [],
      scoresMap: scoresJson as Record<string, number>,
    }
  })

  const allGrades = Array.from(new Set(data.flatMap((d) => d.grades))).sort()
  const allFluency = Array.from(new Set(data.flatMap((d) => d.fluency))).sort()

  return (
    <RankingsView
      data={data}
      categories={allCategories}
      allGrades={allGrades}
      allFluency={allFluency}
      requirementsByWeight={{
        HIGH: scoringRequirements.filter((r) => r.weight === 'HIGH').map((r) => r.id),
        MEDIUM: scoringRequirements.filter((r) => r.weight === 'MEDIUM').map((r) => r.id),
        LOW: scoringRequirements.filter((r) => r.weight === 'LOW').map((r) => r.id),
      }}
    />
  )
}
