import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { AdminDashboard } from './components/AdminDashboard'
import { EvaluatorDashboard } from './components/EvaluatorDashboard'
import { ViewerDashboard } from './components/ViewerDashboard'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id: userId, role } = session.user

  if (canDo(role, 'access:admin')) {
    return <AdminDashboard role={role} />
  }

  if (canDo(role, 'access:evaluate')) {
    return <EvaluatorDashboard userId={userId} role={role} />
  }

  return <ViewerDashboard />
}
