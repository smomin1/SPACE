import { redirect } from 'next/navigation'
import { ListChecksIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { ScreeningQuestionsTable } from './components/ScreeningQuestionsTable'

export default async function ScreeningQuestionsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:screening')) redirect('/dashboard')

  const questions = await prisma.screeningQuestion.findMany({
    orderBy: { num: 'asc' },
  })

  return (
    <div>
      <PageHeader
        icon={ListChecksIcon}
        kicker="Catalogue"
        title="Screening Questions"
        description="Manage the AI screening checklist used by the Tool Scanner."
      />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <ScreeningQuestionsTable initialData={questions} />
      </main>
    </div>
  )
}
