import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params
  const evaluation = await prisma.searchEvaluation.findUnique({ where: { id } })
  if (!evaluation) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({
    id: evaluation.id,
    platformName: evaluation.platformName,
    url: evaluation.url,
    metadata: evaluation.metadata,
    scores: evaluation.scores,
    createdAt: evaluation.createdAt.toISOString(),
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params
  await prisma.searchEvaluation.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
