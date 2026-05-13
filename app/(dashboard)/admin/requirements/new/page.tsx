import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { RequirementForm } from '../components/RequirementForm'

export default async function NewRequirementPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:requirements')) redirect('/dashboard')

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/requirements">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Requirement</h1>
          <p className="text-muted-foreground">Add a new evaluation requirement.</p>
        </div>
      </div>
      <RequirementForm mode="create" />
    </div>
  )
}
