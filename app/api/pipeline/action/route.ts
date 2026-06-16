import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import {
  syncPlatformPipeline,
  syncAllPipelines,
  setStageSkipped,
  linkSearchEvaluation,
} from '@/lib/pipeline-server'

export const runtime = 'nodejs'

const schema = z.object({
  type: z.enum(['sync', 'sync-all', 'skip', 'unskip', 'link']),
  platformId: z.string().optional(),
  stage: z.enum(['AI_SCREENING', 'CEFR', 'VITAL', 'PRD']).optional(),
  searchEvaluationId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:platform')) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body', code: 'BAD_REQUEST' }, { status: 400 })
  }

  try {
    switch (body.type) {
      case 'sync-all':
        await syncAllPipelines()
        return NextResponse.json({ ok: true })
      case 'sync':
        if (!body.platformId) return badRequest('platformId required')
        return NextResponse.json({ ok: true, results: await syncPlatformPipeline(body.platformId) })
      case 'skip':
      case 'unskip':
        if (!body.platformId || !body.stage) return badRequest('platformId and stage required')
        return NextResponse.json({
          ok: true,
          results: await setStageSkipped(body.platformId, body.stage, body.type === 'skip'),
        })
      case 'link':
        if (!body.platformId || !body.searchEvaluationId) return badRequest('platformId and searchEvaluationId required')
        return NextResponse.json({
          ok: true,
          results: await linkSearchEvaluation(body.platformId, body.searchEvaluationId),
        })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pipeline action failed'
    return NextResponse.json({ error: message, code: 'ACTION_FAILED' }, { status: 500 })
  }
}

function badRequest(message: string) {
  return NextResponse.json({ error: message, code: 'BAD_REQUEST' }, { status: 400 })
}
