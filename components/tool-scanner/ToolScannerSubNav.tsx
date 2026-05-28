'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/tool-scanner', label: 'Evaluator', match: (p: string) => p === '/tool-scanner' || /^\/tool-scanner\/[^/]+$/.test(p) },
  { href: '/tool-scanner/rankings', label: 'Rankings', match: (p: string) => p.startsWith('/tool-scanner/rankings') },
  { href: '/tool-scanner/matrix', label: 'Scoring Matrix', match: (p: string) => p.startsWith('/tool-scanner/matrix') },
  { href: '/tool-scanner/analysis', label: 'Categorical Analysis', match: (p: string) => p.startsWith('/tool-scanner/analysis') },
]

export function ToolScannerSubNav() {
  const pathname = usePathname() ?? ''
  return (
    <div className="border-b border-stone-200/70 bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
        {TABS.map((tab) => {
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
