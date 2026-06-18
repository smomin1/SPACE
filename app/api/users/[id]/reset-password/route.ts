import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { generateTempPassword } from '@/lib/auth-utils'
import { sendTemporaryPasswordReset } from '@/lib/email'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'manage:users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (session.user.id === id) {
    return Response.json({ error: 'You cannot reset your own password this way', code: 'SELF_RESET' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, isActive: true },
  })
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!user.isActive) {
    return Response.json({ error: 'Cannot reset password for an inactive user', code: 'USER_INACTIVE' }, { status: 400 })
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      mustChangePassword: true,
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  await sendTemporaryPasswordReset(user.email, user.name, tempPassword)

  return Response.json({ tempPassword })
}
