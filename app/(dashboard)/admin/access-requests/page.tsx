import { redirect } from 'next/navigation'
import { InboxIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { AccessRequestsTable } from '@/components/admin/access-requests/AccessRequestsTable'

export default async function AccessRequestsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:users')) redirect('/dashboard')

  const requests = await prisma.accessRequest.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { reviewedBy: { select: { id: true, name: true } } },
  })

  return (
    <div>
      <PageHeader
        icon={InboxIcon}
        kicker="Administration"
        title="Access Requests"
        description="Review and action pending account requests from team members."
      />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <AccessRequestsTable initialData={requests} />
      </main>
    </div>
  )
}
