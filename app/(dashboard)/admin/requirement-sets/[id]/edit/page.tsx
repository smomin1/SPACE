import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { RequirementSetForm } from '../../components/RequirementSetForm'

export default async function EditRequirementSetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:requirement_sets')) redirect('/dashboard')

  const { id } = await params
  const set = await prisma.requirementSet.findUnique({ where: { id } })
  if (!set) notFound()

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/requirement-sets">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Requirement Set</h1>
          <p className="text-muted-foreground">{set.name}</p>
        </div>
      </div>
      <RequirementSetForm
        mode="edit"
        id={set.id}
        defaultValues={{
          key: set.key,
          name: set.name,
          description: set.description,
          order: set.order,
          isActive: set.isActive,
        }}
      />
    </div>
  )
}
