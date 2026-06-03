import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { PlatformForm } from '@/components/admin/platforms/PlatformForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPlatformPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:platform')) redirect('/dashboard')

  const { id } = await params

  const [platform, users] = await Promise.all([
    prisma.platform.findUnique({
      where: { id },
      include: {
        evaluatorAssignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        // Include the currently linked VITAL tool (if any)
        vitalTools: {
          where: { isAssessmentTool: false },
          select: { id: true, name: true },
          take: 1,
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true },
    }),
  ])

  if (!platform) notFound()

  const linkedVitalTool = platform.vitalTools[0] ?? null

  // Available VITAL apps: unlinked ones + the one already linked to this platform
  const availableVitalTools = await prisma.vitalTool.findMany({
    where: {
      isAssessmentTool: false,
      OR: [
        { platformId: null },
        { platformId: id },
      ],
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/platforms">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Platform</h1>
          <p className="text-muted-foreground">Update details for &ldquo;{platform.name}&rdquo;.</p>
        </div>
      </div>
      <PlatformForm
        platformId={id}
        defaultValues={{
          name: platform.name,
          vendor: platform.vendor,
          track: platform.track,
          licenceType: platform.licenceType ?? undefined,
          trialAvailable: platform.trialAvailable,
        }}
        initialEvaluators={platform.evaluatorAssignments.map((a) => ({
          userId: a.user.id,
          name: a.user.name,
          email: a.user.email,
          evaluatorType: a.evaluatorType,
          isLead: a.isLead,
        }))}
        users={users}
        vitalTools={availableVitalTools}
        linkedVitalToolId={linkedVitalTool?.id ?? null}
      />
    </div>
  )
}
