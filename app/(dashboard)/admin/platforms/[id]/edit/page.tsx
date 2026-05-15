import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
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
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true },
    }),
  ])

  if (!platform) notFound()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Edit Platform</h1>
        <p className="text-muted-foreground">Update details for &ldquo;{platform.name}&rdquo;.</p>
      </div>
      <PlatformForm
        platformId={id}
        defaultValues={{
          name: platform.name,
          vendor: platform.vendor,
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
      />
    </div>
  )
}
