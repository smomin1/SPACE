import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function authorizeCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) return null

  return { id: user.id, email: user.email, name: user.name, role: user.role }
}
