import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from './ProfileForm'

export const metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  })

  if (!user) redirect('/login')

  const roleLabel = user.role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Update your name, email address, or password.
        </p>
      </div>

      {/* Role badge - read only */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-stone-200/80 bg-stone-50/60 px-4 py-3">
        <span className="text-sm text-muted-foreground">Signed in as</span>
        <span className="text-sm font-medium text-emerald-950">{user.email}</span>
        <span className="ml-auto inline-flex items-center rounded-md bg-stone-100/80 ring-1 ring-inset ring-stone-200 px-2 h-[22px] text-[11.5px] font-medium tracking-tight text-emerald-950">
          {roleLabel}
        </span>
      </div>

      <ProfileForm initialName={user.name} initialEmail={user.email} />
    </div>
  )
}
