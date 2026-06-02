import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(200, 'Email is too long')
    .transform((v) => v.trim().toLowerCase()),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name is too long')
    .regex(/^[\p{L}\s'\-\.]+$/u, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .transform((v) => v.trim()),
  team: z.enum([
    'STRATEGY_1', 'STRATEGY_2', 'STRATEGY_3', 'STRATEGY_4',
    'STRATEGY_5', 'STRATEGY_6', 'LEARNING_SCIENCES',
    'EMERGING_TECHNOLOGY', 'RESEARCH_AND_INNOVATION', 'STEERING_COMMITTEE',
  ], { message: 'Please select a team' }),
  requestedRole: z.enum([
    'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR', 'VIEWER',
  ], { message: 'Please select a role' }),
  notes: z.string().max(500, 'Notes must be under 500 characters').optional(),
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
    return Response.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { email, name, team, requestedRole, notes } = parsed.data

  // Check if an active account already exists for this email
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return Response.json(
      { error: 'An account with this email already exists. Try signing in instead.', code: 'ACCOUNT_EXISTS', field: 'email' },
      { status: 409 },
    )
  }

  // Check if there is already a pending request for this email
  const pendingRequest = await prisma.accessRequest.findFirst({
    where: { email, status: 'PENDING' },
  })
  if (pendingRequest) {
    return Response.json(
      { error: 'A request for this email address is already pending review.', code: 'REQUEST_PENDING', field: 'email' },
      { status: 409 },
    )
  }

  const request = await prisma.accessRequest.create({
    data: { email, name, team, requestedRole, notes },
  })

  return Response.json({ request }, { status: 201 })
}
