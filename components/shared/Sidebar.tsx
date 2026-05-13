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
} from 'lucide-react'

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
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <nav
      className={cn(
        'relative flex h-full flex-col border-r bg-background transition-all duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo / wordmark */}
      <div className={cn('flex h-14 items-center border-b px-3', collapsed ? 'justify-center' : 'px-4')}>
        {collapsed ? (
          <MonitorIcon className="size-5 text-muted-foreground" />
        ) : (
          <span className="text-sm font-semibold tracking-tight">EvalPlatform</span>
        )}
      </div>

      {/* Nav links */}
      <ul className="flex-1 space-y-0.5 px-2 py-3">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
                  collapsed && 'justify-center',
                  active
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          'absolute -right-3 top-[3.25rem] flex size-6 items-center justify-center rounded-full border bg-background shadow-sm text-muted-foreground hover:text-foreground transition-colors z-20',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRightIcon className="size-3.5" />
          : <ChevronLeftIcon className="size-3.5" />}
      </button>
    </nav>
  )
}
