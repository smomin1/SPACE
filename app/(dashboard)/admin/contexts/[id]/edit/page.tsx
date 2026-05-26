import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ContextForm } from '@/components/admin/contexts/ContextForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditContextPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:contexts')) redirect('/dashboard')

  const { id } = await params
  const context = await prisma.context.findUnique({ where: { id } })
  if (!context) notFound()

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/contexts">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Context</h1>
          <p className="text-muted-foreground">Update the details for &ldquo;{context.name}&rdquo;.</p>
        </div>
      </div>
      <ContextForm
        contextId={id}
        defaultValues={{
          name: context.name,
          description: context.description ?? undefined,
          learningLevels: context.learningLevels,
          cefrMin: context.cefrMin ?? undefined,
          cefrMax: context.cefrMax ?? undefined,
          skills: context.skills,
          deploymentMode: context.deploymentMode ?? undefined,
        }}
      />
    </div>
  )
}
