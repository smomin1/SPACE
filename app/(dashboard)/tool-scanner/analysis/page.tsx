import { prisma } from '@/lib/prisma'
import { calculateWeightedPercentage } from '@/lib/scoring'
import type { Score } from '@/lib/scoring'
import { loadToolScannerRequirements } from '@/lib/tool-scanner-context'
import { CategoricalAnalysis } from '@/components/tool-scanner/CategoricalAnalysis'

export default async function CategoricalAnalysisPage({
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

  const categories = Array.from(
    new Set(requirements.map((r) => r.category).filter((c): c is string => !!c)),
  ).sort()

  const platforms = evaluations.map((ev) => {
    const scoresJson = ev.scores as Record<string, number>
    const scores: Score[] = Object.entries(scoresJson)
      .filter(([requirementId]) => reqIdSet.has(requirementId))
      .map(([requirementId, value]) => ({
        requirementId,
        value: value as number,
        evidenceType: null,
      }))
    const overallPct = calculateWeightedPercentage(scores, scoringRequirements)

    const categoryPct: Record<string, number> = {}
    for (const cat of categories) {
      const catReqs = scoringRequirements.filter((r) => r.category === cat)
      const catScores = scores.filter((s) =>
        catReqs.some((r) => r.id === s.requirementId),
      )
      categoryPct[cat] = calculateWeightedPercentage(catScores, catReqs)
    }

    return {
      id: ev.id,
      platformName: ev.platformName,
      overallPct,
      categoryPct,
    }
  })

  // Sort by overall score (highest first) so default selection is top performer
  platforms.sort((a, b) => b.overallPct - a.overallPct)

  return <CategoricalAnalysis platforms={platforms} categories={categories} />
}
