import { redirect } from 'next/navigation'
import { MonitorIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { PlatformsTable } from '@/components/admin/platforms/PlatformsTable'

export default async function PlatformsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:platform')) redirect('/dashboard')

  const platforms = await prisma.platform.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      vendor: true,
      track: true,
      licenceType: true,
      trialAvailable: true,
      evaluatorAssignments: {
        select: { id: true, evaluatorType: true },
      },
      evaluations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, state: true },
      },
    },
  })

  return (
    <div>
      <PageHeader
        icon={MonitorIcon}
        kicker="Catalogue"
        title="Platforms"
        description="Register platforms and manage evaluator assignments."
      />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <PlatformsTable initialData={platforms} />
      </main>
    </div>
  )
}
