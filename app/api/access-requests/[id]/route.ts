import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { generateTempPassword } from '@/lib/auth-utils'
import { sendAccessRequestApproved, sendAccessRequestRejected } from '@/lib/email'

const actionSchema = z.object({
  action: z.enum(['approve', 'reject']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDo(session.user.role, 'create:users')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }

  const accessRequest = await prisma.accessRequest.findUnique({ where: { id } })
  if (!accessRequest) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (accessRequest.status !== 'PENDING') {
    return Response.json({ error: 'Request has already been reviewed', code: 'ALREADY_REVIEWED' }, { status: 409 })
  }

  if (parsed.data.action === 'reject') {
    const updated = await prisma.accessRequest.update({
      where: { id },
      data: { status: 'REJECTED', reviewedAt: new Date(), reviewedById: session.user.id },
    })
    await sendAccessRequestRejected(accessRequest.email, accessRequest.name).catch(console.error)
    return Response.json({ request: updated })
  }

  // Approve: create user account with temp password
  const existing = await prisma.user.findUnique({ where: { email: accessRequest.email } })
  if (existing) {
    return Response.json({ error: 'A user with this email already exists', code: 'EMAIL_TAKEN' }, { status: 409 })
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  const [user, updated] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: accessRequest.email,
        name: accessRequest.name,
        role: accessRequest.requestedRole,
        // Additive admin grant requested on the form, approved by Super Admin.
        isAdmin: accessRequest.requestAdmin,
        team: accessRequest.team,
        passwordHash,
        mustChangePassword: true,
        isActive: true,
      },
    }),
    prisma.accessRequest.update({
      where: { id },
      data: { status: 'APPROVED', reviewedAt: new Date(), reviewedById: session.user.id },
    }),
  ])

  let emailSent = true
  try {
    await sendAccessRequestApproved(user.email, user.name, tempPassword)
  } catch (err) {
    console.error('[access-request] email failed:', err)
    emailSent = false
  }

  return Response.json({
    request: updated,
    userId: user.id,
    emailSent,
    // Only included when email failed so admin can share manually
    ...(!emailSent && { tempPassword }),
  })
}
