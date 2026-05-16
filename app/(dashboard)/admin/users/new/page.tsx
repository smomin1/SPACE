import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { UserForm } from '@/components/admin/users/UserForm'

export default async function NewUserPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:users')) redirect('/dashboard')

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Create User</h1>
        <p className="text-muted-foreground">
          Add a new account. The user can log in immediately with the password you set.
        </p>
      </div>
      <UserForm mode="create" />
    </div>
  )
}
