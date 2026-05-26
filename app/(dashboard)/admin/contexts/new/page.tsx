import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { ContextForm } from '@/components/admin/contexts/ContextForm'

export default async function NewContextPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:contexts')) redirect('/dashboard')

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/contexts">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Context</h1>
          <p className="text-muted-foreground">
            Create a new evaluation context. You can assign requirements after saving.
          </p>
        </div>
      </div>
      <ContextForm />
    </div>
  )
}
