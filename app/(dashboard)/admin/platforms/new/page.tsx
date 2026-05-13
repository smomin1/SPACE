import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PlatformForm } from '@/components/admin/platforms/PlatformForm'

export default async function NewPlatformPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:platform')) redirect('/dashboard')

  const users = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR'] } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, role: true },
  })

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Register Platform</h1>
        <p className="text-muted-foreground">
          Add a new platform to the registry and assign evaluators.
        </p>
      </div>
      <PlatformForm users={users} />
    </div>
  )
}
