import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canDo } from '@/lib/permissions'
import { alignmentPercent } from '@/lib/cefr'

export const runtime = 'nodejs'

const bodySchema = z.object({
  platformId: z.string().min(1),
  status: z.enum(['DRAFT', 'COMPLETED']).default('COMPLETED'),
  responses: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.enum(['YES', 'PARTIAL', 'NO', 'NA']),
        fitConfidence: z.number().int().min(1).max(5).nullable().optional(),
        evidence: z.string().max(2000).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .min(1),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'submit:cefr_score')) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await req.json())
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message ?? 'Invalid body' : 'Invalid JSON'
    return NextResponse.json({ error: message, code: 'BAD_REQUEST' }, { status: 400 })
  }

  const platform = await prisma.platform.findUnique({ where: { id: parsed.platformId }, select: { id: true } })
  if (!platform) {
    return NextResponse.json({ error: 'Platform not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const alignmentPct = parsed.status === 'COMPLETED' ? alignmentPercent(parsed.responses) : null

  // One CEFR evaluation per platform: upsert it, then replace its responses.
  const saved = await prisma.$transaction(async (tx) => {
    const evaluation = await tx.cefrEvaluation.upsert({
      where: { platformId: parsed.platformId },
      update: { status: parsed.status, alignmentPct },
      create: {
        platformId: parsed.platformId,
        status: parsed.status,
        alignmentPct,
        createdById: session.user.id as string,
      },
    })
    await tx.cefrResponse.deleteMany({ where: { evaluationId: evaluation.id } })
    await tx.cefrResponse.createMany({
      data: parsed.responses.map((r) => ({
        evaluationId: evaluation.id,
        questionId: r.questionId,
        answer: r.answer,
        fitConfidence: r.fitConfidence ?? null,
        evidence: r.evidence ?? null,
        notes: r.notes ?? null,
      })),
    })
    return evaluation
  })

  return NextResponse.json({ id: saved.id, alignmentPct: saved.alignmentPct, status: saved.status })
}
