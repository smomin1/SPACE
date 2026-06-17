import type { NotificationType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ─── In-app notifications ───────────────────────────────────────────────────────
// Lightweight notification helpers used for pipeline hand-offs: an evaluator gets
// notified when assigned a platform, and admins get notified when a stage passes
// so they can assign the next one. Surfaced as a sidebar badge + /notifications.

type NewNotification = {
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
}

export async function notifyUser(userId: string, n: NewNotification) {
  await prisma.notification.create({
    data: { userId, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null },
  })
}

/** Notify every admin / super-admin (and additively-elevated admins). */
export async function notifyAdmins(n: NewNotification) {
  const admins = await prisma.user.findMany({
    where: { isActive: true, OR: [{ role: { in: ['SUPER_ADMIN', 'ADMIN'] } }, { isAdmin: true }] },
    select: { id: true },
  })
  if (admins.length === 0) return
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
    })),
  })
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}
