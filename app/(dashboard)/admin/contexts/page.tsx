import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { ContextsTable } from '@/components/admin/contexts/ContextsTable'

export default async function ContextsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:contexts')) redirect('/dashboard')

  const contexts = await prisma.context.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      learningLevels: true,
      cefrMin: true,
      cefrMax: true,
      deploymentMode: true,
      _count: { select: { requirements: true } },
    },
  })

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Context Builder</h1>
        <p className="text-muted-foreground">
          Define evaluation contexts and assign requirements to each one.
        </p>
      </div>
      <ContextsTable initialData={contexts} />
    </div>
  )
}
