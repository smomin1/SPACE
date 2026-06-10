import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  email:    z.string().email().max(200).optional(),
  name:     z.string().min(1).max(120).optional(),
  role:     z.enum(['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR', 'VIEWER']).optional(),
  isAdmin:  z.boolean().optional(),
  team:     z.enum([
    'STRATEGY_1', 'STRATEGY_2', 'STRATEGY_3', 'STRATEGY_4',
    'STRATEGY_5', 'STRATEGY_6', 'STRATEGY_7', 'IMPLEMENTATION_LAB',
    'LEARNING_SCIENCES', 'EMERGING_TECHNOLOGY', 'RESEARCH_AND_INNOVATION', 'STEERING_COMMITTEE',
  ]).optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isAdmin: true, isActive: true, createdAt: true, updatedAt: true },
  })
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ user })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return Response.json({ error: 'Not found' }, { status: 404 })

  const { email, name, role, team, isActive, password } = parsed.data

  // Email uniqueness check
  if (email && email !== target.email) {
    const clash = await prisma.user.findUnique({ where: { email } })
    if (clash) return Response.json({ error: 'A user with this email already exists', code: 'EMAIL_TAKEN' }, { status: 409 })
  }

  // Self-protection: cannot change own role or deactivate self
  if (session.user.id === id) {
    if (role && role !== session.user.role) {
      return Response.json({ error: 'You cannot change your own role', code: 'SELF_DEMOTE' }, { status: 400 })
    }
    if (isActive === false) {
      return Response.json({ error: 'You cannot deactivate your own account', code: 'SELF_DEACTIVATE' }, { status: 400 })
    }
  }

  // ADMIN cannot elevate anyone to SUPER_ADMIN
  if (role === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    return Response.json({ error: 'Only a Super Admin can assign the Super Admin role', code: 'FORBIDDEN_ROLE' }, { status: 403 })
  }

  const data: Record<string, unknown> = {}
  if (email    !== undefined) data.email    = email
  if (name     !== undefined) data.name     = name
  if (role     !== undefined) data.role     = role
  if (team     !== undefined) data.team     = team
  if (isActive !== undefined) data.isActive = isActive
  if (password !== undefined) data.passwordHash = await bcrypt.hash(password, 10)

  // Additive admin grant. Recompute whenever the grant or the role changes, and
  // force it off when the (effective) role is already ADMIN/SUPER_ADMIN.
  if (parsed.data.isAdmin !== undefined || role !== undefined) {
    const effectiveRole = role ?? target.role
    data.isAdmin =
      effectiveRole === 'ADMIN' || effectiveRole === 'SUPER_ADMIN'
        ? false
        : parsed.data.isAdmin ?? target.isAdmin
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, isAdmin: true, isActive: true },
  })

  return Response.json({ user })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (session.user.id === id) {
    return Response.json({ error: 'You cannot delete your own account', code: 'SELF_DELETE' }, { status: 400 })
  }

  // Check for foreign references that would block delete
  const [scoreCount, assignmentCount, platformAssignmentCount] = await Promise.all([
    prisma.score.count({ where: { userId: id } }),
    prisma.evaluatorAssignment.count({ where: { userId: id } }),
    prisma.platformEvaluatorAssignment.count({ where: { userId: id } }),
  ])

  if (scoreCount > 0 || assignmentCount > 0 || platformAssignmentCount > 0) {
    return Response.json(
      { error: 'This user has activity history and cannot be deleted. Deactivate them instead.', code: 'HAS_ACTIVITY' },
      { status: 409 },
    )
  }

  await prisma.user.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
