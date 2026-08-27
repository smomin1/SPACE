import { redirect } from 'next/navigation'
import { ListChecksIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getToolScannerContext } from '@/lib/requirement-sets'
import { PageHeader } from '@/components/shared/PageHeader'
import { RequirementSetSwitcher } from '@/components/shared/RequirementSetSwitcher'
import { ScreeningQuestionsTable } from './components/ScreeningQuestionsTable'

export default async function ScreeningQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:screening')) redirect('/dashboard')

  const { set } = await searchParams
  const { sets, current } = await getToolScannerContext(set)

  const questions = current
    ? await prisma.screeningQuestion.findMany({
        where: { requirementSetId: current.id },
        orderBy: { num: 'asc' },
      })
    : []

  return (
    <div>
      <PageHeader
        icon={ListChecksIcon}
        kicker="Catalogue"
        title="Screening Questions"
        description="Manage the AI screening checklist used by the Tool Scanner."
      />
      <main className="mx-auto max-w-7xl px-6 py-6 space-y-4">
        {current ? (
          <>
            <RequirementSetSwitcher sets={sets} activeKey={current.key} />
            <ScreeningQuestionsTable
              initialData={questions}
              activeSetKey={current.key}
              activeSetId={current.id}
              activeSetName={current.name}
            />
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/30 px-6 py-12 text-center text-[13px] text-stone-500">
            No requirement sets are configured yet. Create one under Requirement Sets first.
          </div>
        )}
      </main>
    </div>
  )
}
