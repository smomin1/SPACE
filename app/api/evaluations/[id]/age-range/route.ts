import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canDo } from '@/lib/permissions'
import { AGE_MIN_BOUND, AGE_MAX_BOUND, hasAgeRangeConflict } from '@/lib/age-range'

const schema = z
  .object({
    ageMin: z.number().int().min(AGE_MIN_BOUND).max(AGE_MAX_BOUND),
    ageMax: z.number().int().min(AGE_MIN_BOUND).max(AGE_MAX_BOUND),
  })
  .refine(d => d.ageMin <= d.ageMax, { message: 'ageMin must be ≤ ageMax' })

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: evaluationId } = await params

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: {
      state: true,
      ageRanges: {
        select: {
          id: true,
          userId: true,
          evaluatorType: true,
          ageMin: true,
          ageMax: true,
          updatedAt: true,
          user: { select: { name: true } },
        },
      },
      ageRangeConflict: { select: { id: true, isClosed: true } },
    },
  })
  if (!evaluation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Score isolation: during IN_PROGRESS only return own submission (same as scores API)
  const canViewAll = canDo(session.user.role, 'view:all_scores')
  const ranges =
    evaluation.state === 'IN_PROGRESS' && !canViewAll
      ? evaluation.ageRanges.filter(r => r.userId === session.user!.id)
      : evaluation.ageRanges

  return NextResponse.json({ ranges, conflict: evaluation.ageRangeConflict })
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
  const { ageMin, ageMax } = parsed.data

  const [evaluation, assignment] = await Promise.all([
    prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: {
        state: true,
        lockedAt: true,
        ageRangeConflict: { select: { id: true, isClosed: true } },
      },
    }),
    prisma.evaluatorAssignment.findUnique({
      where: { evaluationId_userId: { evaluationId, userId } },
      select: { evaluatorType: true, hasSubmitted: true },
    }),
  ])

  if (!evaluation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (evaluation.lockedAt) return NextResponse.json({ error: 'Evaluation is locked' }, { status: 403 })
  if (!assignment) return NextResponse.json({ error: 'Not assigned to this evaluation' }, { status: 403 })
  if (assignment.evaluatorType !== 'PEDAGOGY') {
    return NextResponse.json({ error: 'Only pedagogy evaluators submit age range assessments' }, { status: 403 })
  }
  if (assignment.hasSubmitted && evaluation.state === 'IN_PROGRESS') {
    return NextResponse.json({ error: 'Cannot change age range after submission' }, { status: 403 })
  }

  await prisma.platformAgeRange.upsert({
    where: { evaluationId_userId: { evaluationId, userId } },
    create: { evaluationId, userId, evaluatorType: assignment.evaluatorType, ageMin, ageMax },
    update: { ageMin, ageMax },
  })

  // During MERGED: auto-close the conflict if all ranges now agree
  let conflictAutoClosed = false
  if (
    evaluation.state === 'MERGED' &&
    evaluation.ageRangeConflict &&
    !evaluation.ageRangeConflict.isClosed
  ) {
    const allRanges = await prisma.platformAgeRange.findMany({
      where: { evaluationId, evaluatorType: 'PEDAGOGY' },
      select: { ageMin: true, ageMax: true },
    })
    if (!hasAgeRangeConflict(allRanges)) {
      await prisma.ageRangeConflict.update({
        where: { id: evaluation.ageRangeConflict.id },
        data: { isClosed: true, closedAt: new Date(), closedById: userId },
      })
      conflictAutoClosed = true
    }
  }

  return NextResponse.json({ ok: true, conflictAutoClosed })
}
