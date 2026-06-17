import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

const schema = z.union([
  z.object({ platformId: z.string().min(1) }),
  z.object({ name: z.string().min(1), vendor: z.string().min(1) }),
])

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:platform')) return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

  let body: unknown
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    if ('platformId' in parsed.data) {
      // Init CEFR evaluation for an already-existing platform
      const existing = await prisma.cefrEvaluation.findUnique({ where: { platformId: parsed.data.platformId } })
      if (existing) return Response.json({ cefrEvaluation: existing }, { status: 200 })
      const cefrEvaluation = await prisma.cefrEvaluation.create({
        data: { platformId: parsed.data.platformId, createdById: session.user.id },
      })
      return Response.json({ cefrEvaluation }, { status: 201 })
    }

    // Create new platform + CEFR evaluation together
    const { name, vendor } = parsed.data
    const result = await prisma.$transaction(async (tx) => {
      const platform = await tx.platform.create({
        data: { name, vendor, track: 'CEFR', trialAvailable: false },
      })
      const cefrEvaluation = await tx.cefrEvaluation.create({
        data: { platformId: platform.id, createdById: session.user.id },
      })
      return { platform, cefrEvaluation }
    })
    return Response.json(result, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('Unique constraint') || msg.includes('P2002')) {
      return Response.json({ error: 'A platform with that name already exists.', code: 'DUPLICATE' }, { status: 409 })
    }
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
