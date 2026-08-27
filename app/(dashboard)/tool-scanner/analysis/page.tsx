import { prisma } from '@/lib/prisma'
import { coveragePercent, coverageByCategory } from '@/lib/screening'
import { getToolScannerContext } from '@/lib/requirement-sets'
import { CategoricalAnalysis } from '@/components/tool-scanner/CategoricalAnalysis'

export default async function CategoricalAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>
}) {
  const { set } = await searchParams
  const { current } = await getToolScannerContext(set)

  if (!current) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/30 px-6 py-12 text-center text-[13px] text-stone-500">
        No requirement sets are configured yet.
      </div>
    )
  }

  const [evaluations, questions] = await Promise.all([
    prisma.searchEvaluation.findMany({
      where: { requirementSetId: current.id },
      orderBy: { createdAt: 'desc' },
      include: { responses: { select: { questionId: true, answer: true } } },
    }),
    prisma.screeningQuestion.findMany({ where: { requirementSetId: current.id }, orderBy: { num: 'asc' } }),
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
