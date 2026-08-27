'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { RequirementSetOption } from '@/components/shared/RequirementSetSwitcher'

// Reserved tab slugs: a single-segment route that is NOT one of these is an
// evaluation detail page (/tool-scanner/{id}), which highlights the Evaluator tab.
const RESERVED = ['/tool-scanner/best-fit', '/tool-scanner/rankings', '/tool-scanner/matrix', '/tool-scanner/analysis', '/tool-scanner/screening']

type Tab = { href: string; label: string; match: (p: string) => boolean; adminOnly?: boolean }

const TABS: Tab[] = [
  { href: '/tool-scanner', label: 'Evaluator', match: (p: string) => p === '/tool-scanner' || (/^\/tool-scanner\/[^/]+$/.test(p) && !RESERVED.includes(p)) },
  { href: '/tool-scanner/best-fit', label: 'Best Fit', match: (p: string) => p.startsWith('/tool-scanner/best-fit') },
  { href: '/tool-scanner/rankings', label: 'Rankings', match: (p: string) => p.startsWith('/tool-scanner/rankings') },
  { href: '/tool-scanner/matrix', label: 'Scoring Matrix', match: (p: string) => p.startsWith('/tool-scanner/matrix') },
  { href: '/tool-scanner/analysis', label: 'Categorical Analysis', match: (p: string) => p.startsWith('/tool-scanner/analysis') },
  { href: '/tool-scanner/screening', label: 'Screening Questions', match: (p: string) => p === '/tool-scanner/screening' || p.startsWith('/tool-scanner/screening/'), adminOnly: true },
]

export function ToolScannerSubNav({
  isAdmin = false,
  sets = [],
}: {
  isAdmin?: boolean
  sets?: RequirementSetOption[]
}) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)

  const activeKey = searchParams?.get('set') || sets[0]?.key
  const setQuery = sets.length > 1 && activeKey ? `?set=${encodeURIComponent(activeKey)}` : ''

  return (
    <div className="border-b border-stone-200/70 bg-white/80">
      {sets.length > 1 && (
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-6 pt-3">
          {sets.map((s) => {
            const params = new URLSearchParams(searchParams?.toString())
            params.set('set', s.key)
            const href = `${pathname}?${params.toString()}`
            const active = s.key === activeKey
            return (
              <Link
                key={s.id}
                href={href}
                className={cn(
                  'inline-flex h-7 items-center rounded-full px-3 text-[12px] font-medium transition-colors',
                  active
                    ? 'bg-emerald-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
                )}
              >
                {s.name}
              </Link>
            )
          })}
        </div>
      )}
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
        {visibleTabs.map((tab) => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={`${tab.href}${setQuery}`}
              className={cn(
                'inline-flex h-11 items-center border-b-2 px-3 text-[13px] font-medium transition-colors',
                active
                  ? 'border-emerald-800 text-emerald-950'
                  : 'border-transparent text-stone-500 hover:text-emerald-900',
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
