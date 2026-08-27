'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { Role } from '@prisma/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboardIcon,
  ClipboardListIcon,
  LayersIcon,
  MonitorIcon,
  BarChart2Icon,
  ClipboardCheckIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogOutIcon,
  SparklesIcon,
  HelpCircleIcon,
  InboxIcon,
  CompassIcon,
  MilestoneIcon,
  LanguagesIcon,
  GitBranchIcon,
  BellIcon,
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
    roles: ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR', 'VIEWER'],
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: UsersIcon,
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/admin/access-requests',
    label: 'Access Requests',
    icon: InboxIcon,
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/admin/pipeline',
    label: 'Pipeline',
    icon: GitBranchIcon,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/tool-scanner',
    label: 'Tool Scanner',
    icon: SparklesIcon,
    roles: ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR', 'VIEWER'],
  },
  {
    href: '/admin/platforms',
    label: 'Platforms',
    icon: MonitorIcon,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/evaluations',
    label: 'Evaluations',
    icon: ClipboardCheckIcon,
    roles: ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR'],
  },
  {
    href: '/admin/vital',
    label: 'Manage VITAL & CEFR',
    icon: MilestoneIcon,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/vital',
    label: 'VITAL Insights',
    icon: CompassIcon,
    roles: ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR', 'VIEWER'],
  },
  {
    href: '/admin/requirements',
    label: 'Requirements',
    icon: ClipboardListIcon,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/admin/requirement-sets',
    label: 'Requirement Sets',
    icon: LayersIcon,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/results',
    label: 'Results',
    icon: BarChart2Icon,
    roles: ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR', 'VIEWER'],
  },
  {
    href: '/faq',
    label: 'FAQ',
    icon: HelpCircleIcon,
    roles: ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VITAL_EVALUATOR', 'VIEWER'],
  },
]

interface SidebarProps {
  role: Role
  userName?: string
  userInitials?: string
  roleLabel?: string
  pendingAccessRequests?: number
  unreadNotifications?: number
}

export function Sidebar({ role, userName, userInitials = '?', roleLabel, pendingAccessRequests = 0, unreadNotifications = 0 }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [collapsed, setCollapsed] = React.useState(false)

  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role))

  function isActive(href: string): boolean {
    const [hrefPath, hrefQuery] = href.split('?')
    if (hrefQuery) {
      // href has query params - must match both path and all query params
      const hrefParams = new URLSearchParams(hrefQuery)
      for (const [k, v] of hrefParams.entries()) {
        if (searchParams.get(k) !== v) return false
      }
      return pathname === hrefPath
    }
    // Plain path - but don't match if the current URL has query params that map to a more specific item
    // (e.g. /evaluations with track=CEFR should not match the plain /evaluations item)
    const hasSpecificItem = visible.some((item) => {
      const [iPath, iQuery] = item.href.split('?')
      if (!iQuery) return false
      const iParams = new URLSearchParams(iQuery)
      for (const [k, v] of iParams.entries()) {
        if (searchParams.get(k) !== v) return false
      }
      return pathname === iPath
    })
    if (hasSpecificItem) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav
      className={cn(
        'relative flex h-full flex-col border-r border-primary/15 bg-primary text-white/90 transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[232px]',
      )}
    >
      {/* Brand block */}
      <div
        className={cn(
          'flex h-16 items-center gap-2.5 border-b border-gold/40',
          collapsed ? 'justify-center px-2' : 'px-5',
        )}
      >
        <div className="relative group flex size-8 shrink-0 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dome.svg" alt="SPACE" className="size-8" />
          {collapsed && (
            <span
              className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded px-[0.85rem] py-[0.4rem] text-[0.78rem] text-white opacity-0 transition-opacity duration-150 ease-in group-hover:opacity-100"
              style={{
                background: 'var(--color-text)',
                borderBottom: '1px solid var(--color-secondary)',
                fontFamily: 'var(--font-sans, Inter, sans-serif)',
              }}
            >
              Software Platform Analysis, Comparison, and Evaluation
            </span>
          )}
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col -space-y-0.5">
            <span className="relative group/wordmark inline-block">
              <span className="font-serif text-[16px] tracking-tight text-white">SPACE</span>
              <span
                className="pointer-events-none absolute left-0 top-full z-50 mt-2 whitespace-nowrap rounded px-[0.85rem] py-[0.4rem] text-[0.78rem] text-white opacity-0 transition-opacity duration-150 ease-in group-hover/wordmark:opacity-100"
                style={{
                  background: 'var(--color-text)',
                  borderBottom: '1px solid var(--color-secondary)',
                  fontFamily: 'var(--font-sans, Inter, sans-serif)',
                }}
              >
                Software Platform Analysis, Comparison, and Evaluation
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <p className="px-2 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
            Workspace
          </p>
        )}
        <ul className="space-y-0.5">
          {visible.map((item) => {
            const active = isActive(item.href)
            const badgeCount =
              item.href === '/admin/access-requests' ? pendingAccessRequests
              : item.href === '/notifications' ? unreadNotifications
              : 0
            return (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'group flex h-9 items-center gap-3 rounded-md px-2.5 text-[13px] transition-colors',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'bg-white/10 text-white font-medium ring-1 ring-inset ring-white/12'
                      : 'text-white/70 hover:text-gold hover:bg-white/[0.05]',
                  )}
                >
                  <item.icon
                    className={cn(
                      'size-4 shrink-0',
                      active ? 'text-white/80' : 'text-white/55 group-hover:text-gold',
                    )}
                  />
                  {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                  {badgeCount > 0 && (
                    collapsed ? (
                      <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-emerald-950">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    ) : (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-emerald-950">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Footer / user */}
      <div className="border-t border-white/10 p-3">
        <AlertDialog>
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2 py-2',
              collapsed && 'justify-center px-0',
            )}
          >
            <Link
              href="/profile"
              title="Profile settings"
              className={cn(
                'flex shrink-0 items-center gap-2.5 min-w-0 rounded-md transition-colors hover:opacity-80',
                collapsed ? 'justify-center' : 'flex-1',
              )}
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-medium tracking-wide text-white ring-1 ring-white/15">
                {userInitials}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-white">
                    {userName ?? 'Signed in'}
                  </p>
                  <p className="font-mono text-[10.5px] uppercase tracking-wider text-white/55">
                    {roleLabel ?? role.replace(/_/g, ' ').toLowerCase()}
                  </p>
                </div>
              )}
            </Link>
            <AlertDialogTrigger asChild>
              <button
                title="Sign out"
                className={cn(
                  'flex size-7 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/[0.06] hover:text-gold',
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
        className="absolute -right-3 top-[3.25rem] z-20 flex size-6 items-center justify-center rounded-full border border-primary/15 bg-white text-primary shadow-sm transition-colors hover:bg-neutral-100"
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
