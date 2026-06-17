'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

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

export function ToolScannerSubNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname() ?? ''
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)
  return (
    <div className="border-b border-stone-200/70 bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
        {visibleTabs.map((tab) => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
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
