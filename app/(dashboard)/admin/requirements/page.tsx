import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { RequirementsTable } from './components/RequirementsTable'

export default async function RequirementsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:requirements')) redirect('/dashboard')

  const requirements = await prisma.requirement.findMany({
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  })

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Requirements Master</h1>
        <p className="text-muted-foreground">
          Manage evaluation requirements across all platforms.
        </p>
      </div>
      <RequirementsTable initialData={requirements} />
    </div>
  )
}
