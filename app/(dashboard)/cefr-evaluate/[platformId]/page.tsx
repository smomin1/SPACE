import { redirect, notFound } from 'next/navigation'
import { LanguagesIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { CefrEvaluatorWorkspace } from '@/components/cefr/CefrEvaluatorWorkspace'

export default async function CefrEvaluatePage({
  params,
}: {
  params: Promise<{ platformId: string }>
}) {
  const { platformId } = await params

  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'submit:cefr_score')) redirect('/cefr')

  const [platform, levels, skills, questions, evaluation] = await Promise.all([
    prisma.platform.findUnique({ where: { id: platformId }, select: { id: true, name: true, vendor: true } }),
    prisma.cefrLevel.findMany({ orderBy: { order: 'asc' }, select: { id: true, code: true, label: true } }),
    prisma.cefrSkill.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true, group: true } }),
    prisma.cefrQuestion.findMany({
      orderBy: [{ level: { order: 'asc' } }, { skill: { order: 'asc' } }, { num: 'asc' }],
      select: { id: true, levelId: true, skillId: true, num: true, text: true, quickReference: true },
    }),
    prisma.cefrEvaluation.findUnique({
      where: { platformId },
      select: { status: true, responses: { select: { questionId: true, answer: true, fitConfidence: true, notes: true } } },
    }),
  ])

  if (!platform) notFound()

  const initialResponses = Object.fromEntries(
    (evaluation?.responses ?? []).map((r) => [
      r.questionId,
      { answer: r.answer, fitConfidence: r.fitConfidence, notes: r.notes },
    ]),
  )

  return (
    <div>
      <PageHeader icon={LanguagesIcon} kicker="CEFR Evaluation" title={platform.name} />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <CefrEvaluatorWorkspace
          platformId={platform.id}
          platformName={platform.name}
          levels={levels}
          skills={skills}
          questions={questions}
          initialResponses={initialResponses}
          initialStatus={evaluation?.status ?? 'NONE'}
        />
      </main>
    </div>
  )
}
