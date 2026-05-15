'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/results/comparison',     label: 'Comparison' },
  { href: '/results/breakdown',       label: 'Categories' },
  { href: '/results/best-fit',       label: 'Best Fit' },
  { href: '/results/coverage',       label: 'Coverage Gap' },
  { href: '/results/evidence',       label: 'Evidence Quality' },
  { href: '/results/build-readiness', label: 'Build Readiness' },
]

export function ResultsNav() {
  const pathname = usePathname()

  return (
    <nav className="-mb-px flex gap-0 overflow-x-auto" aria-label="Results views">
      {TABS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + '?')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex shrink-0 items-center border-b-2 px-4 py-3 text-[13px] font-medium transition-colors whitespace-nowrap',
              active
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700',
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
