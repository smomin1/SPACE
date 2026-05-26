import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SetupForm } from './SetupForm'
import { ShieldCheckIcon } from 'lucide-react'

export default async function SetupPage() {
  const hasSuperAdmin = (await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })) > 0
  if (hasSuperAdmin) redirect('/login')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-neutral)] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheckIcon className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-[var(--color-text)]">
            Initial Setup
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Create the Super Admin account to get started. This can only be done once.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-lg border border-stone-200/80 bg-white px-8 py-7 shadow-sm">
          <SetupForm />
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          SPACE: Software Platform Analysis, Comparison, and Evaluation
        </p>
      </div>
    </div>
  )
}
