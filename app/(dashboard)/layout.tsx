import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/shared/Sidebar'
import { Footer } from '@/components/shared/Footer'
import { ROLE_SHORT_LABELS } from '@/lib/roles'

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { role, baseRole, isAdmin, name } = session.user

  const [pendingAccessRequests, unreadNotifications] = await Promise.all([
    role === 'SUPER_ADMIN'
      ? prisma.accessRequest.count({ where: { status: 'PENDING' } })
      : Promise.resolve(0),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ])

  // Label reflects the true base role; an additive grant appends "+ Admin".
  const showAdminSuffix = isAdmin && baseRole !== 'ADMIN' && baseRole !== 'SUPER_ADMIN'
  const roleLabel = `${ROLE_SHORT_LABELS[baseRole] ?? baseRole}${showAdminSuffix ? ' + Admin' : ''}`

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={role}
        userName={name ?? undefined}
        userInitials={getInitials(name)}
        roleLabel={roleLabel}
        pendingAccessRequests={pendingAccessRequests}
        unreadNotifications={unreadNotifications}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-[520px]">{children}</div>
        <Footer />
      </main>
    </div>
  )
}
