import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { requirementBaseSchema } from '@/lib/requirement-schema'
import type { EvaluatorType } from '@prisma/client'
import { scoreSingleRequirement } from '@/lib/claude-tool-scanner'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  // Any authenticated user can read requirements (evaluators need the list to score against).
  // No role gate here - just authentication.

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const evaluatorType = searchParams.get('evaluatorType') as EvaluatorType | null
  const isComplianceGateParam = searchParams.get('isComplianceGate')

  const where: Record<string, unknown> = {}
  if (category) where.category = category
  if (evaluatorType) where.evaluatorType = evaluatorType
  if (isComplianceGateParam !== null) {
    where.isComplianceGate = isComplianceGateParam === 'true'
  }

  try {
    const requirements = await prisma.requirement.findMany({
      where,
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    })
    return Response.json({ requirements })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

/**
 * Back-fills Tool Scanner scores for the newly created requirement against every
 * existing SearchEvaluation. Runs in the background so the API response stays fast.
 * Failures per platform are swallowed (the helper returns 0); a complete outage
 * (no API key, etc.) is logged and skipped silently.
 */
async function backfillToolScannerScores(requirement: {
  id: string
  title: string
  description: string
  category: string | null
  weight: 'HIGH' | 'MEDIUM' | 'LOW'
  isComplianceGate: boolean
  order: number
}) {
  if (!process.env.ANTHROPIC_API_KEY) return

  const evaluations = await prisma.searchEvaluation.findMany({
    select: { id: true, platformName: true, url: true, scores: true },
  })
  if (evaluations.length === 0) return

  await Promise.all(
    evaluations.map(async (ev) => {
      try {
        const score = await scoreSingleRequirement(ev.platformName, ev.url, requirement)
        const current = (ev.scores ?? {}) as Record<string, number>
        const merged = { ...current, [requirement.id]: score }
        await prisma.searchEvaluation.update({
          where: { id: ev.id },
          data: { scores: merged as unknown as Prisma.InputJsonValue },
        })
      } catch (err) {
        console.error('Tool Scanner back-fill failed for evaluation', ev.id, err)
      }
    }),
  )
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:requirements')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = requirementBaseSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const requirement = await prisma.requirement.create({ data: parsed.data })

    // Fire-and-forget: backfill Tool Scanner scores for existing evaluations.
    // The admin sees the new requirement immediately; scores appear shortly after.
    void backfillToolScannerScores(requirement).catch((err) => {
      console.error('Tool Scanner back-fill task crashed', err)
    })

    return Response.json({ requirement }, { status: 201 })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
