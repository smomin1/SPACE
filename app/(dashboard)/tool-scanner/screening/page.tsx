import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getToolScannerContext } from '@/lib/requirement-sets'
import { ScreeningQuestionsTable } from '@/app/(dashboard)/admin/screening-questions/components/ScreeningQuestionsTable'

export default async function ToolScannerScreeningPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:screening')) redirect('/tool-scanner')

  const { set } = await searchParams
  const { current } = await getToolScannerContext(set)

  if (!current) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/30 px-6 py-12 text-center text-[13px] text-stone-500">
        No requirement sets are configured yet.
      </div>
    )
  }

  const questions = await prisma.screeningQuestion.findMany({
    where: { requirementSetId: current.id },
    orderBy: { num: 'asc' },
  })

  return (
    <ScreeningQuestionsTable
      initialData={questions}
      basePath="/tool-scanner/screening"
      activeSetKey={current.key}
      activeSetId={current.id}
      activeSetName={current.name}
    />
  )
}
