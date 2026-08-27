import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { RequirementSetForm } from '../components/RequirementSetForm'

export default async function NewRequirementSetPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:requirement_sets')) redirect('/dashboard')

  const maxOrder = await prisma.requirementSet.aggregate({ _max: { order: true } })
  const nextOrder = (maxOrder._max.order ?? -1) + 1

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/requirement-sets">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Requirement Set</h1>
          <p className="text-muted-foreground">Add a new Tool Scanner checklist domain.</p>
        </div>
      </div>
      <RequirementSetForm mode="create" defaultValues={{ order: nextOrder }} />
    </div>
  )
}
