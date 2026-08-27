'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface RequirementSetOption {
  id: string
  key: string
  name: string
}

// Domain switcher: tabs that carry the `?set=<key>` query param, consistent with
// the FilterBar pattern in app/(dashboard)/results/. Renders nothing when there's
// only one active RequirementSet, so existing users see no UI change until a
// second domain exists.
export function RequirementSetSwitcher({
  sets,
  activeKey,
}: {
  sets: RequirementSetOption[]
  activeKey: string
}) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()

  if (sets.length <= 1) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
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
  )
}
