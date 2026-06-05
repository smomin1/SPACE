import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canDo } from '@/lib/permissions'

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
      id: true,
      isClosed: true,
      closedAt: true,
      closedBy: { select: { name: true } },
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

  return NextResponse.json({ conflict })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: evaluationId } = await params
  const userId = session.user.id

  const body = await req.json().catch(() => ({}))
  if (body.action !== 'close') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Only admins or leads can manually close
  const isAdmin = canDo(session.user.role, 'lock:evaluation')
  if (!isAdmin) {
    const assignment = await prisma.evaluatorAssignment.findUnique({
      where: { evaluationId_userId: { evaluationId, userId } },
      select: { isLead: true },
    })
    if (!assignment?.isLead) {
      return NextResponse.json({ error: 'Only leads or admins can close this conflict' }, { status: 403 })
    }
  }

  const conflict = await prisma.ageRangeConflict.findUnique({
    where: { evaluationId },
    select: { id: true, isClosed: true },
  })
  if (!conflict) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (conflict.isClosed) return NextResponse.json({ error: 'Already closed' }, { status: 400 })

  const updated = await prisma.ageRangeConflict.update({
    where: { id: conflict.id },
    data: { isClosed: true, closedAt: new Date(), closedById: userId },
  })

  return NextResponse.json({ conflict: updated })
}
