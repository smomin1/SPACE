import { prisma } from '@/lib/prisma'
import { coveragePercent, coverageByCategory } from '@/lib/screening'
import { RankingsView } from '@/components/tool-scanner/RankingsView'

export default async function RankingsPage() {
  const [evaluations, questions] = await Promise.all([
    prisma.searchEvaluation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { responses: { select: { questionId: true, answer: true } } },
    }),
    prisma.screeningQuestion.findMany({ orderBy: { num: 'asc' } }),
  ])

  const allCategories = Array.from(new Set(questions.map((q) => q.category)))

  const data = evaluations.map((ev) => {
    const md = ev.metadata as {
      Target_Audience?: string
      Fluency_Levels?: string[]
      Grade_Levels?: string[]
    } | null

    return {
      id: ev.id,
      platformName: ev.platformName,
      url: ev.url,
      overallPct: coveragePercent(ev.responses),
      categoryPct: coverageByCategory(questions, ev.responses),
      audience: md?.Target_Audience ?? '',
      fluency: md?.Fluency_Levels ?? [],
      grades: md?.Grade_Levels ?? [],
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
    />
  )
}
