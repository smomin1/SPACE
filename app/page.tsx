import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  const hasSuperAdmin = (await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })) > 0
  if (!hasSuperAdmin) redirect('/setup')

  const session = await auth()
  redirect(session?.user ? '/dashboard' : '/login')
}
