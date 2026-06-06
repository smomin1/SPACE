import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { UserForm } from '@/components/admin/users/UserForm'

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:users')) redirect('/dashboard')

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isAdmin: true, team: true, isActive: true },
  })
  if (!user) notFound()

  const isSelf = session.user.id === user.id

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit User</h1>
          <p className="text-muted-foreground">
            Update profile details, role, or set a new password.
          </p>
        </div>
      </div>
      <UserForm mode="edit" user={user} isSelf={isSelf} currentUserRole={session.user.role} />
    </div>
  )
}
