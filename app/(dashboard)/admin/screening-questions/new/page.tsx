import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getToolScannerContext } from '@/lib/requirement-sets'
import { Button } from '@/components/ui/button'
import { ScreeningQuestionForm } from '../components/ScreeningQuestionForm'

export default async function NewScreeningQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:screening')) redirect('/dashboard')

  const { set } = await searchParams
  const { current } = await getToolScannerContext(set)
  if (!current) redirect('/admin/screening-questions')

  const [categoryRows, maxNum] = await Promise.all([
    prisma.screeningQuestion.findMany({
      where: { requirementSetId: current.id },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    }),
    prisma.screeningQuestion.aggregate({
      where: { requirementSetId: current.id },
      _max: { num: true },
    }),
  ])
  const categories = categoryRows.map((r) => r.category)
  const nextNum = (maxNum._max.num ?? 0) + 1

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/screening-questions">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Screening Question</h1>
          <p className="text-muted-foreground">
            Add a question to the {current.name} checklist.
          </p>
        </div>
      </div>
      <ScreeningQuestionForm
        mode="create"
        categories={categories}
        defaultValues={{ num: nextNum }}
        requirementSetId={current.id}
      />
    </div>
  )
}
