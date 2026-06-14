import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ScreeningQuestionForm } from '../components/ScreeningQuestionForm'

export default async function NewScreeningQuestionPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:screening')) redirect('/dashboard')

  const [categoryRows, maxNum] = await Promise.all([
    prisma.screeningQuestion.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    }),
    prisma.screeningQuestion.aggregate({ _max: { num: true } }),
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
          <p className="text-muted-foreground">Add a question to the AI screening checklist.</p>
        </div>
      </div>
      <ScreeningQuestionForm mode="create" categories={categories} defaultValues={{ num: nextNum }} />
    </div>
  )
}
