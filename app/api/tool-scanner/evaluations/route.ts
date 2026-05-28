import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateWeightedPercentage } from '@/lib/scoring'
import type { Score, Requirement } from '@/lib/scoring'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const [evaluations, requirements] = await Promise.all([
    prisma.searchEvaluation.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.requirement.findMany(),
  ])

  const reqs: Requirement[] = requirements.map((r) => ({
    id: r.id,
    weight: r.weight,
    category: r.category,
    isComplianceGate: r.isComplianceGate,
    contextIds: [],
  }))

  const rows = evaluations.map((ev) => {
    const scoresJson = ev.scores as Record<string, number>
    const scores: Score[] = Object.entries(scoresJson).map(([requirementId, value]) => ({
      requirementId,
      value: value as number,
      evidenceType: null,
    }))
    const overallPct = calculateWeightedPercentage(scores, reqs)
    return {
      id: ev.id,
      platformName: ev.platformName,
      url: ev.url,
      metadata: ev.metadata,
      createdAt: ev.createdAt.toISOString(),
      overallPct,
    }
  })

  return NextResponse.json(rows)
}
