import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { UserForm } from '@/components/admin/users/UserForm'

export default async function NewUserPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'create:users')) redirect('/dashboard')

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create User</h1>
          <p className="text-muted-foreground">
            Add a new account. The user can log in immediately with the password you set.
          </p>
        </div>
      </div>
      <UserForm mode="create" currentUserRole={session.user.role} />
    </div>
  )
}
