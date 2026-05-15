'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

type ChartType = 'bar' | 'radar'

export function ChartToggle({ active }: { active: ChartType }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  function set(type: ChartType) {
    const next = new URLSearchParams(searchParams.toString())
    next.set('chart', type)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  return (
    <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5 gap-0.5">
      {(['bar', 'radar'] as const).map(type => (
        <button
          key={type}
          onClick={() => set(type)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-all',
            active === type
              ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-stone-200/80'
              : 'text-stone-500 hover:text-stone-700',
          )}
        >
          {type === 'bar' ? (
            <>
              <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="8" width="3" height="7" rx="0.5"/>
                <rect x="6" y="4" width="3" height="11" rx="0.5"/>
                <rect x="11" y="1" width="3" height="14" rx="0.5"/>
              </svg>
              Bar
            </>
          ) : (
            <>
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="8,1 15,6 12,14 4,14 1,6"/>
              </svg>
              Radar
            </>
          )}
        </button>
      ))}
    </div>
  )
}
