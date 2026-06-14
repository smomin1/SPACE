import { prisma } from '@/lib/prisma'
import { ScoringMatrix } from '@/components/tool-scanner/ScoringMatrix'
import type { ScreeningAnswer } from '@prisma/client'

export default async function ScoringMatrixPage() {
  const [evaluations, questions] = await Promise.all([
    prisma.searchEvaluation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { responses: { select: { questionId: true, answer: true } } },
    }),
    prisma.screeningQuestion.findMany({ orderBy: { num: 'asc' } }),
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
