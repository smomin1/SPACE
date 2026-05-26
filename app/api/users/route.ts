import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  email: z.string().email().max(200),
  name:  z.string().min(1).max(120),
  role:  z.enum(['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VIEWER']),
  password: z.string().min(8).max(200),
  isActive: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true, email: true, name: true, role: true, isActive: true,
      createdAt: true, updatedAt: true,
    },
  })
  return Response.json({ users })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'create:users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
  }

  const { email, name, role, password, isActive } = parsed.data

  // Enforce single SUPER_ADMIN
  if (role === 'SUPER_ADMIN') {
    const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
    if (superAdminCount > 0) {
      return Response.json({ error: 'A Super Admin account already exists', code: 'SUPER_ADMIN_EXISTS' }, { status: 409 })
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return Response.json({ error: 'A user with this email already exists', code: 'EMAIL_TAKEN' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, name, role, passwordHash, isActive: isActive ?? true },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  })

  return Response.json({ user }, { status: 201 })
}
