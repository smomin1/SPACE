import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { syncPlatformPipeline } from '@/lib/pipeline-server'
import { z } from 'zod'

const linkSchema = z.object({
  vitalToolId: z.string().nullable(),
})

// Link or unlink a VitalTool to/from this platform.
// Body: { vitalToolId: string | null }
// - string: clears any existing link on this platform, then links the given VitalTool
// - null:   clears any existing link (unlinks)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!canDo(session.user.role, 'manage:platform')) {
    return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = linkSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Bad Request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { vitalToolId } = parsed.data

  try {
    await prisma.$transaction(async (tx) => {
      // Clear any existing VitalTool link to this platform
      await tx.vitalTool.updateMany({
        where: { platformId: id },
        data: { platformId: null },
      })
      // Set the new link
      if (vitalToolId) {
        await tx.vitalTool.update({
          where: { id: vitalToolId },
          data: { platformId: id },
        })
      }
    })
    // Linking a scored assessment feeds the VITAL stage immediately so the pipeline
    // marks VITAL done (and may advance to PRD) without waiting for the next sync.
    await syncPlatformPipeline(id)
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
