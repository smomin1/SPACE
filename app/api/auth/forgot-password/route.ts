import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { generateResetToken } from '@/lib/auth-utils'
import { sendPasswordResetEmail } from '@/lib/email'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { email } = parsed.data

  // Always return 200 to avoid email enumeration
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) {
    return Response.json({ ok: true })
  }

  const token = generateResetToken()
  const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  })

  await sendPasswordResetEmail(user.email, user.name, token)

  return Response.json({ ok: true })
}
