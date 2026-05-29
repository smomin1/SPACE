import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(120),
  team: z.enum([
    'STRATEGY_1', 'STRATEGY_2', 'STRATEGY_3', 'STRATEGY_4',
    'STRATEGY_5', 'STRATEGY_6', 'LEARNING_SCIENCES',
    'EMERGING_TECHNOLOGY', 'RESEARCH_AND_INNOVATION', 'STEERING_COMMITTEE',
  ]),
  requestedRole: z.enum([
    'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VIEWER',
  ]),
  notes: z.string().max(500).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const requests = await prisma.accessRequest.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { reviewedBy: { select: { id: true, name: true } } },
  })

  return Response.json({ requests })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
  }

  const request = await prisma.accessRequest.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      team: parsed.data.team,
      requestedRole: parsed.data.requestedRole,
      notes: parsed.data.notes,
    },
  })

  return Response.json({ request }, { status: 201 })
}
