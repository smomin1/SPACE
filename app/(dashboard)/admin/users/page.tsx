import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { UsersTable } from '@/components/admin/users/UsersTable'

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:users')) redirect('/dashboard')

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true, email: true, name: true, role: true, isActive: true, createdAt: true,
    },
  })

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">User Accounts</h1>
        <p className="text-muted-foreground">
          Create and manage accounts, assign roles, and deactivate users.
        </p>
      </div>
      <UsersTable initialData={users} currentUserId={session.user.id} />
    </div>
  )
}
