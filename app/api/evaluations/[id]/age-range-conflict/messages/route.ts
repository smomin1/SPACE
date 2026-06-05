import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({ body: z.string().min(1).max(4000) })

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: evaluationId } = await params

  const conflict = await prisma.ageRangeConflict.findUnique({
    where: { evaluationId },
    select: {
      isClosed: true,
      messages: {
        select: {
          id: true,
          body: true,
          createdAt: true,
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!conflict) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ messages: conflict.messages, isClosed: conflict.isClosed })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: evaluationId } = await params
  const userId = session.user.id

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const conflict = await prisma.ageRangeConflict.findUnique({
    where: { evaluationId },
    select: { id: true, isClosed: true },
  })
  if (!conflict) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (conflict.isClosed) return NextResponse.json({ error: 'Thread is closed' }, { status: 400 })

  const message = await prisma.ageRangeConflictMessage.create({
    data: { conflictId: conflict.id, userId, body: parsed.data.body },
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { id: true, name: true, role: true } },
    },
  })

  return NextResponse.json({ message })
}
