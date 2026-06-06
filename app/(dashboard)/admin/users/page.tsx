import { redirect } from 'next/navigation'
import { UsersIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { UsersTable } from '@/components/admin/users/UsersTable'

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:users')) redirect('/dashboard')

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true, email: true, name: true, role: true, isAdmin: true, team: true, isActive: true, createdAt: true,
    },
  })

  return (
    <div>
      <PageHeader
        icon={UsersIcon}
        kicker="Administration"
        title="Users"
        description="Manage accounts, assign roles, and deactivate users."
      />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <UsersTable
          initialData={users}
          currentUserId={session.user.id}
          canCreate={canDo(session.user.role, 'create:users')}
        />
      </main>
    </div>
  )
}
