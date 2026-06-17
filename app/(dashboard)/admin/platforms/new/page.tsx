import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { PlatformForm } from '@/components/admin/platforms/PlatformForm'

export default async function NewPlatformPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:platform')) redirect('/dashboard')

  const { track: trackParam } = await searchParams
  const defaultTrack =
    trackParam === 'CEFR' ? 'CEFR' as const
    : trackParam === 'VITAL' ? 'VITAL' as const
    : 'TOOL' as const

  const backHref =
    defaultTrack === 'CEFR' ? '/admin/platforms?tab=cefr'
    : defaultTrack === 'VITAL' ? '/admin/platforms?tab=vital'
    : '/admin/platforms'

  const [users, vitalTools] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.vitalTool.findMany({
      where: { platformId: null, isAssessmentTool: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Register Platform</h1>
          <p className="text-muted-foreground">
            Add a new platform to the registry and assign evaluators.
          </p>
        </div>
      </div>
      <PlatformForm
        users={users}
        vitalTools={vitalTools}
        defaultValues={{ track: defaultTrack }}
        backHref={backHref}
      />
    </div>
  )
}
