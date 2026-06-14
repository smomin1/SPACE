import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coveragePercent } from '@/lib/screening'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const evaluations = await prisma.searchEvaluation.findMany({
    orderBy: { createdAt: 'desc' },
    include: { responses: { select: { answer: true } } },
  })

  const rows = evaluations.map((ev) => ({
    id: ev.id,
    platformName: ev.platformName,
    url: ev.url,
    metadata: ev.metadata,
    createdAt: ev.createdAt.toISOString(),
    coveragePct: coveragePercent(ev.responses),
  }))

  return NextResponse.json(rows)
}
