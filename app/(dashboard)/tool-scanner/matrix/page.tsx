import { prisma } from '@/lib/prisma'
import { getToolScannerContext } from '@/lib/requirement-sets'
import { ScoringMatrix } from '@/components/tool-scanner/ScoringMatrix'
import type { ScreeningAnswer } from '@prisma/client'

export default async function ScoringMatrixPage({
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

  const platforms = evaluations.map((ev) => ({
    id: ev.id,
    platformName: ev.platformName,
    answerMap: Object.fromEntries(
      ev.responses.map((r) => [r.questionId, r.answer]),
    ) as Record<string, ScreeningAnswer>,
  }))

  const reqs = questions.map((q) => ({
    id: q.id,
    num: q.num,
    title: q.question,
    category: q.category,
  }))

  return <ScoringMatrix platforms={platforms} questions={reqs} />
}
