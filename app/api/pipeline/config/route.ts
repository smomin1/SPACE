import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getOrCreateConfig } from '@/lib/pipeline-server'

export const runtime = 'nodejs'

const pct = z.number().min(0).max(100)
const schema = z.object({
  aiThreshold: pct.optional(),
  cefrThreshold: pct.optional(),
  vitalThreshold: pct.optional(),
  prdThreshold: pct.optional(),
  aiWeight: pct.optional(),
  cefrWeight: pct.optional(),
  vitalWeight: pct.optional(),
  prdWeight: pct.optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:platform')) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  let data: z.infer<typeof schema>
  try {
    data = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body', code: 'BAD_REQUEST' }, { status: 400 })
  }

  await getOrCreateConfig()
  const updated = await prisma.pipelineConfig.update({ where: { id: 'singleton' }, data })
  return NextResponse.json(updated)
}
