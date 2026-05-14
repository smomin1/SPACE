import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/shared/Sidebar'

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const ROLE_LABELS: Record<string, string> = {
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={role}
        userName={name ?? undefined}
        userInitials={getInitials(name)}
        roleLabel={ROLE_LABELS[role]}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
