import { redirect } from 'next/navigation'
import { LayersIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { RequirementSetsTable } from './components/RequirementSetsTable'

export default async function RequirementSetsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:requirement_sets')) redirect('/dashboard')

  const sets = await prisma.requirementSet.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { screeningQuestions: true, searchEvaluations: true } },
    },
  })

  return (
    <div>
      <PageHeader
        icon={LayersIcon}
        kicker="Catalogue"
        title="Requirement Sets"
        description="Manage the Tool Scanner's checklist domains (ESL, LMS, Internet Devices, ...)."
      />
      <main className="mx-auto max-w-5xl px-6 py-6">
        <RequirementSetsTable initialData={sets} />
      </main>
    </div>
  )
}
