import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/shared/Sidebar'
import { Footer } from '@/components/shared/Footer'

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrator',
  PEDAGOGY_EVALUATOR: 'Pedagogy',
  TECHNICAL_EVALUATOR: 'Technical',
  VIEWER: 'Viewer',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { role, name } = session.user

  const pendingAccessRequests = role === 'SUPER_ADMIN'
    ? await prisma.accessRequest.count({ where: { status: 'PENDING' } })
    : 0

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={role}
        userName={name ?? undefined}
        userInitials={getInitials(name)}
        roleLabel={ROLE_LABELS[role]}
        pendingAccessRequests={pendingAccessRequests}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-[520px]">{children}</div>
        <Footer />
      </main>
    </div>
  )
}
