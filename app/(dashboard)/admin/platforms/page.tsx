import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
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
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Platform Registry</h1>
        <p className="text-muted-foreground">
          Register platforms and manage evaluator assignments.
        </p>
      </div>
      <PlatformsTable initialData={platforms} />
    </div>
  )
}
