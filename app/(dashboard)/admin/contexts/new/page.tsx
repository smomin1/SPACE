import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { ContextForm } from '@/components/admin/contexts/ContextForm'

export default async function NewContextPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:contexts')) redirect('/dashboard')

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">New Context</h1>
        <p className="text-muted-foreground">
          Create a new evaluation context. You can assign requirements after saving.
        </p>
      </div>
      <ContextForm />
    </div>
  )
}
