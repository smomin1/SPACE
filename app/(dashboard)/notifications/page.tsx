import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BellIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { markAllRead } from '@/lib/notifications'
import { relativeTime } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = session.user.id as string

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Mark everything read on view so the sidebar badge clears. The list still
  // highlights what was unread (captured above before the update).
  await markAllRead(userId)

  return (
    <div>
      <PageHeader icon={BellIcon} kicker="Inbox" title="Notifications" />
      <main className="mx-auto max-w-3xl px-6 py-6">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/40 px-6 py-16 text-center">
            <p className="text-[13px] text-stone-500">No notifications yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => {
              const unread = n.readAt === null
              const inner = (
                <div
                  className={
                    'rounded-xl border px-4 py-3 transition-colors ' +
                    (unread
                      ? 'border-emerald-200/70 bg-emerald-50/40'
                      : 'border-stone-200/70 bg-white')
                  }
                >
                  <div className="flex items-start gap-3">
                    {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-emerald-950">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-[12.5px] text-stone-600">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-stone-400">{relativeTime(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              )
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link href={n.link} className="block hover:opacity-90">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
