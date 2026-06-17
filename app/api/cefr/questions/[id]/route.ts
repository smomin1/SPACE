import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const schema = z.object({
  text: z.string().min(1),
  quickReference: z.string().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:vital')) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

  const { id } = await params

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const question = await prisma.cefrQuestion.findUnique({ where: { id } })
  if (!question) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

  const updated = await prisma.cefrQuestion.update({
    where: { id },
    data: { text: body.text, quickReference: body.quickReference ?? null },
    select: { id: true, text: true, quickReference: true },
  })

  return NextResponse.json(updated)
}
