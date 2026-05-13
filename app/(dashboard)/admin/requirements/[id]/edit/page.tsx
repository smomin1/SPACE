import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { RequirementForm } from '../../components/RequirementForm'

export default async function EditRequirementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:requirements')) redirect('/dashboard')

  const { id } = await params
  const requirement = await prisma.requirement.findUnique({ where: { id } })
  if (!requirement) notFound()

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/requirements">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Requirement</h1>
          <p className="text-muted-foreground">{requirement.title}</p>
        </div>
      </div>
      <RequirementForm
        mode="edit"
        id={requirement.id}
        defaultValues={{
          title: requirement.title,
          description: requirement.description,
          evaluatorType: requirement.evaluatorType,
          weight: requirement.weight,
          isComplianceGate: requirement.isComplianceGate,
          category: requirement.category,
          order: requirement.order,
        }}
      />
    </div>
  )
}
