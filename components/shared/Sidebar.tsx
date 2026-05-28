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
  ClipboardCheckIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogOutIcon,
  SparklesIcon,
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
    roles: ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VIEWER'],
  },
  {
    href: '/tool-scanner',
    label: 'Tool Scanner',
    icon: SparklesIcon,
    roles: ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VIEWER'],
  },
  {
    href: '/admin/requirements',
    label: 'Requirements',
    icon: ClipboardListIcon,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/admin/contexts',
    label: 'Contexts',
    icon: TagsIcon,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/admin/platforms',
    label: 'Platforms',
    icon: MonitorIcon,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: UsersIcon,
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/evaluations',
    label: 'Evaluations',
    icon: ClipboardCheckIcon,
    roles: ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR'],
  },
  {
    href: '/results',
    label: 'Results',
    icon: BarChart2Icon,
    roles: ['SUPER_ADMIN', 'ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VIEWER'],
  },
]

interface SidebarProps {
  role: Role
  userName?: string
  userInitials?: string
  roleLabel?: string
}

export function Sidebar({ role, userName, userInitials = '?', roleLabel }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role))

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
                  {!collapsed && <span className="truncate">{item.label}</span>}
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
