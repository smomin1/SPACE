'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@prisma/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboardIcon,
  ClipboardListIcon,
  TagsIcon,
  MonitorIcon,
  BarChart2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogOutIcon,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboardIcon,
    roles: ['ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VIEWER'],
  },
  {
    href: '/admin/requirements',
    label: 'Requirements',
    icon: ClipboardListIcon,
    roles: ['ADMIN'],
  },
  {
    href: '/admin/contexts',
    label: 'Contexts',
    icon: TagsIcon,
    roles: ['ADMIN'],
  },
  {
    href: '/admin/platforms',
    label: 'Platforms',
    icon: MonitorIcon,
    roles: ['ADMIN'],
  },
  {
    href: '/results',
    label: 'Results',
    icon: BarChart2Icon,
    roles: ['ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VIEWER'],
  },
]

interface SidebarProps {
  role: Role
  userName?: string
  userInitials?: string
  roleLabel?: string
}

export function Sidebar({ role, userName, userInitials = 'AD', roleLabel }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <nav
      className={cn(
        // Deep forest sidebar — sets the bespoke enterprise tone the moment the app loads
        'relative flex h-full flex-col border-r border-emerald-950/15 bg-emerald-950 text-emerald-50/90 transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[232px]',
      )}
    >
      {/* Brand block */}
      <div
        className={cn(
          'flex h-16 items-center gap-2.5 border-b border-emerald-50/10',
          collapsed ? 'justify-center px-2' : 'px-5',
        )}
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-50/8 ring-1 ring-emerald-50/15">
          <MonitorIcon className="size-4 text-emerald-200" />
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col -space-y-0.5">
            <span className="font-serif text-[16px] tracking-tight text-emerald-50">Eval</span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-emerald-200/60">
              Platform Evaluation
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <p className="px-2 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-200/45">
            Workspace
          </p>
        )}
        <ul className="space-y-0.5">
          {visible.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'group flex h-9 items-center gap-3 rounded-md px-2.5 text-[13px] transition-colors',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'bg-emerald-50/10 text-emerald-50 font-medium ring-1 ring-inset ring-emerald-50/12'
                      : 'text-emerald-100/70 hover:text-emerald-50 hover:bg-emerald-50/[0.05]',
                  )}
                >
                  <item.icon
                    className={cn(
                      'size-4 shrink-0',
                      active ? 'text-emerald-200' : 'text-emerald-200/55 group-hover:text-emerald-200',
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && active && (
                    <span className="ml-auto size-1 rounded-full bg-emerald-300/80" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Footer / user */}
      <div className="border-t border-emerald-50/10 p-3">
        <AlertDialog>
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2 py-2',
              collapsed && 'justify-center px-0',
            )}
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50/10 text-[11px] font-medium tracking-wide text-emerald-100 ring-1 ring-emerald-50/15">
              {userInitials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-emerald-50">
                  {userName ?? 'Signed in'}
                </p>
                <p className="font-mono text-[10.5px] uppercase tracking-wider text-emerald-200/55">
                  {roleLabel ?? role.replace('_', ' ').toLowerCase()}
                </p>
              </div>
            )}
            <AlertDialogTrigger asChild>
              <button
                title={collapsed ? 'Sign out' : 'Sign out'}
                className={cn(
                  'flex size-7 items-center justify-center rounded-md text-emerald-200/55 transition-colors hover:bg-emerald-50/[0.06] hover:text-emerald-50',
                  collapsed && 'mx-auto',
                )}
              >
                <LogOutIcon className="size-4" />
                <span className="sr-only">Sign out</span>
              </button>
            </AlertDialogTrigger>
          </div>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be returned to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => signOut({ callbackUrl: '/login' })}>
                Sign out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-[3.25rem] z-20 flex size-6 items-center justify-center rounded-full border border-emerald-950/15 bg-white text-emerald-900 shadow-sm transition-colors hover:bg-emerald-50"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRightIcon className="size-3.5" />
        ) : (
          <ChevronLeftIcon className="size-3.5" />
        )}
      </button>
    </nav>
  )
}
