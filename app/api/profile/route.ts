import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120).optional(),
  email: z.string().email('Invalid email').max(200).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200).optional(),
}).refine(
  (data) => {
    // If newPassword is provided, currentPassword must also be provided
    if (data.newPassword && !data.currentPassword) return false
    return true
  },
  { message: 'Current password is required to set a new password', path: ['currentPassword'] },
)

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  })

  if (!user) {
    return Response.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  return Response.json({ user })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { name, email, currentPassword, newPassword } = parsed.data

  // Fetch current user (need passwordHash for verification)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true, email: true },
  })

  if (!user) {
    return Response.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  // If changing password, verify current password first
  if (newPassword) {
    const valid = await bcrypt.compare(currentPassword!, user.passwordHash)
    if (!valid) {
      return Response.json(
        { error: 'Current password is incorrect', code: 'WRONG_PASSWORD' },
        { status: 400 },
      )
    }
  }

  // If changing email, ensure no other user has that email
  if (email && email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return Response.json(
        { error: 'That email address is already in use', code: 'EMAIL_TAKEN' },
        { status: 409 },
      )
    }
  }

  const updateData: Record<string, string> = {}
  if (name) updateData.name = name
  if (email) updateData.email = email
  if (newPassword) updateData.passwordHash = await bcrypt.hash(newPassword, 10)

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: 'No changes provided', code: 'NO_CHANGES' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true },
  })

  return Response.json({ user: updated })
}
