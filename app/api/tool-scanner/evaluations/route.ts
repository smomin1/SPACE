import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coveragePercent } from '@/lib/screening'
import { kickWorker } from '@/lib/tool-scanner-queue'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  // Idempotent: resumes the queue if the process restarted with work outstanding.
  kickWorker()

  const evaluations = await prisma.searchEvaluation.findMany({
    orderBy: { createdAt: 'desc' },
    include: { responses: { select: { answer: true } } },
  })

  const rows = evaluations.map((ev) => ({
    id: ev.id,
    platformName: ev.platformName,
    url: ev.url,
    metadata: ev.metadata,
    status: ev.status,
    error: ev.error,
    startedAt: ev.startedAt?.toISOString() ?? null,
    completedAt: ev.completedAt?.toISOString() ?? null,
    createdAt: ev.createdAt.toISOString(),
    coveragePct: coveragePercent(ev.responses),
  }))

  return NextResponse.json(rows)
}
