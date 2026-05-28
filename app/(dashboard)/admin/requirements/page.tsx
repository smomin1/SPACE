import { redirect } from 'next/navigation'
import { ClipboardListIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { RequirementsTable } from './components/RequirementsTable'

export default async function RequirementsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:requirements')) redirect('/dashboard')

  const requirements = await prisma.requirement.findMany({
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  })

  return (
    <div>
      <PageHeader
        icon={ClipboardListIcon}
        kicker="Catalogue"
        title="Requirements"
        description="Manage evaluation requirements across all platforms."
      />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <RequirementsTable initialData={requirements} />
      </main>
    </div>
  )
}
