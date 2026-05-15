import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { role } = session.user

  if (role === 'ADMIN') redirect('/admin/platforms')
  if (role === 'PEDAGOGY_EVALUATOR' || role === 'TECHNICAL_EVALUATOR') redirect('/evaluations')
  redirect('/results')
}
