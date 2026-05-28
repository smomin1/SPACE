import { redirect } from 'next/navigation'
import { TagsIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
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
    <div>
      <PageHeader
        icon={TagsIcon}
        kicker="Catalogue"
        title="Contexts"
        description="Define evaluation contexts and assign requirements to each one."
      />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <ContextsTable initialData={contexts} />
      </main>
    </div>
  )
}
