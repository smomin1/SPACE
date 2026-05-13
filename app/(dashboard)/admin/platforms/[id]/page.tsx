import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PlatformDetail } from '@/components/admin/platforms/PlatformDetail'
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PlatformDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:platform')) redirect('/dashboard')

  const { id } = await params

  const platform = await prisma.platform.findUnique({
    where: { id },
    include: {
      contexts: { include: { context: { select: { id: true, name: true } } } },
      evaluatorAssignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { evaluatorType: 'asc' },
      },
      evaluations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, state: true, createdAt: true },
      },
    },
  })

  if (!platform) notFound()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/platforms">
            <ChevronLeftIcon className="mr-1 size-4" />
            Back to Platforms
          </Link>
        </Button>
      </div>
      <PlatformDetail platform={platform} />
    </div>
  )
}
