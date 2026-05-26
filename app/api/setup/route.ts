import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const setupSchema = z.object({
  name:     z.string().min(1).max(120),
  email:    z.string().email().max(200),
  password: z.string().min(8).max(200),
})

export async function POST(req: Request) {
  // Block if a Super Admin already exists
  const existing = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
  if (existing > 0) {
    return Response.json(
      { error: 'Setup is already complete. A Super Admin account exists.', code: 'ALREADY_SET_UP' },
      { status: 409 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = setupSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  const emailTaken = await prisma.user.findUnique({ where: { email } })
  if (emailTaken) {
    return Response.json({ error: 'A user with this email already exists', code: 'EMAIL_TAKEN' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.create({
    data: { name, email, passwordHash, role: 'SUPER_ADMIN', isActive: true },
  })

  return Response.json({ ok: true }, { status: 201 })
}
