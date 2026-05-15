import * as React from 'react'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'emerald' | 'amber' | 'red'

const VALUE_CLS: Record<Tone, string> = {
  default: 'text-emerald-950',
  emerald: 'text-emerald-700',
  amber:   'text-amber-600',
  red:     'text-red-600',
}

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  tone?: Tone
  icon?: React.ComponentType<{ className?: string }>
}

export function StatCard({ label, value, sub, tone = 'default', icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white px-5 py-4 flex items-start gap-3">
      {Icon && (
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-stone-100">
          <Icon className="size-4 text-stone-500" />
        </div>
      )}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
        <p className={cn('text-2xl font-bold tabular-nums tracking-tight mt-0.5', VALUE_CLS[tone])}>
          {value}
        </p>
        {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
