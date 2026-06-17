import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ScreeningQuestionForm } from '@/app/(dashboard)/admin/screening-questions/components/ScreeningQuestionForm'

export default async function ToolScannerEditScreeningQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:screening')) redirect('/tool-scanner')

  const { id } = await params
  const [question, categoryRows] = await Promise.all([
    prisma.screeningQuestion.findUnique({ where: { id } }),
    prisma.screeningQuestion.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    }),
  ])
  if (!question) notFound()
  const categories = categoryRows.map((r) => r.category)

  return (
    <div className="max-w-3xl py-4">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tool-scanner/screening">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Screening Question</h1>
          <p className="text-muted-foreground line-clamp-1">{question.question}</p>
        </div>
      </div>
      <ScreeningQuestionForm
        mode="edit"
        id={question.id}
        categories={categories}
        defaultValues={{
          num: question.num,
          category: question.category,
          question: question.question,
          whatToLookFor: question.whatToLookFor,
          hardFail: question.hardFail,
        }}
        backPath="/tool-scanner/screening"
      />
    </div>
  )
}
