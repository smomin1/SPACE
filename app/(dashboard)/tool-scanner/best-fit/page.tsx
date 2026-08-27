import { prisma } from '@/lib/prisma'
import { getToolScannerContext } from '@/lib/requirement-sets'
import { BestFitView } from '@/components/tool-scanner/BestFitView'
import type { BestFitTool, BestFitQuestion } from '@/lib/tool-scanner-best-fit'
import type { ScreeningAnswer } from '@prisma/client'

export default async function BestFitPage({
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
      where: { status: 'COMPLETED', requirementSetId: current.id },
      orderBy: { createdAt: 'desc' },
      include: { responses: { select: { questionId: true, answer: true } } },
    }),
    prisma.screeningQuestion.findMany({
      where: { requirementSetId: current.id },
      orderBy: { num: 'asc' },
      select: { id: true, num: true, category: true, question: true },
    }),
  ])

  const questionInputs: BestFitQuestion[] = questions
  const categories = Array.from(new Set(questions.map((q) => q.category)))

  const tools: BestFitTool[] = evaluations.map((ev) => {
    const md = ev.metadata as {
      Target_Audience?: string
      Fluency_Levels?: string[]
      Grade_Levels?: string[]
    } | null

    const answers: Record<string, ScreeningAnswer> = {}
    for (const r of ev.responses) answers[r.questionId] = r.answer

    return {
      id: ev.id,
      name: ev.platformName,
      url: ev.url,
      grades: md?.Grade_Levels ?? [],
      fluency: md?.Fluency_Levels ?? [],
      audience: md?.Target_Audience ?? '',
      answers,
    }
  })

  const allGrades = Array.from(new Set(tools.flatMap((t) => t.grades))).sort()
  const allFluency = Array.from(new Set(tools.flatMap((t) => t.fluency))).sort()

  return (
    <BestFitView
      tools={tools}
      questions={questionInputs}
      categories={categories}
      allGrades={allGrades}
      allFluency={allFluency}
    />
  )
}
