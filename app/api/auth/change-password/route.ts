import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  // When mustChangePassword is true the user is logging in for the first time with a
  // temp password. Verify the current (temp) password before allowing the change.
  const match = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!match) {
    return Response.json({ error: 'Current password is incorrect.', code: 'WRONG_PASSWORD' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  })

  return Response.json({ ok: true })
}
