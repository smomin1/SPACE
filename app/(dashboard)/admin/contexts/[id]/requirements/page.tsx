import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { RequirementMatrix } from '@/components/admin/contexts/RequirementMatrix'
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContextRequirementsPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:contexts')) redirect('/dashboard')

  const { id } = await params
  const context = await prisma.context.findUnique({ where: { id } })
  if (!context) notFound()

  const [allRequirements, assigned] = await Promise.all([
    prisma.requirement.findMany({
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    }),
    prisma.requirementContext.findMany({
      where: { contextId: id },
      select: { requirementId: true },
    }),
  ])

  const assignedIds = new Set(assigned.map((r) => r.requirementId))
  const requirements = allRequirements.map((r) => ({ ...r, assigned: assignedIds.has(r.id) }))

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/contexts">
            <ChevronLeftIcon className="mr-1 size-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assign Requirements</h1>
          <p className="text-muted-foreground">
            Toggle which requirements belong to <strong>{context.name}</strong>.
            Changes save immediately.
          </p>
        </div>
      </div>

      <RequirementMatrix
        contextId={id}
        contextName={context.name}
        initialRequirements={requirements}
      />
    </div>
  )
}
