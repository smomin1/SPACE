import { prisma } from '@/lib/prisma'
import { coveragePercent, coverageByCategory } from '@/lib/screening'
import { CategoricalAnalysis } from '@/components/tool-scanner/CategoricalAnalysis'

export default async function CategoricalAnalysisPage() {
  const [evaluations, questions] = await Promise.all([
    prisma.searchEvaluation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { responses: { select: { questionId: true, answer: true } } },
    }),
    prisma.screeningQuestion.findMany({ orderBy: { num: 'asc' } }),
  ])

  const categories = Array.from(new Set(questions.map((q) => q.category)))

  const platforms = evaluations.map((ev) => ({
    id: ev.id,
    platformName: ev.platformName,
    overallPct: coveragePercent(ev.responses),
    categoryPct: coverageByCategory(questions, ev.responses),
  }))

  // Sort by overall coverage (highest first) so default selection is top performer
  platforms.sort((a, b) => b.overallPct - a.overallPct)

  return <CategoricalAnalysis platforms={platforms} categories={categories} />
}
