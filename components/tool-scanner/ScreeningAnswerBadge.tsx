import { cn } from '@/lib/utils'
import type { ScreeningAnswer } from '@prisma/client'

const ANSWER_META: Record<ScreeningAnswer, { label: string; cls: string }> = {
  YES:     { label: 'Yes',     cls: 'bg-emerald-100/80 text-emerald-900 ring-emerald-800/40' },
  PARTIAL: { label: 'Partial', cls: 'bg-amber-100/80 text-amber-900 ring-amber-700/30' },
  NO:      { label: 'No',      cls: 'bg-red-50 text-red-800 ring-red-700/30' },
  UNKNOWN: { label: 'Unknown', cls: 'bg-stone-100 text-stone-500 ring-stone-300' },
}

export function ScreeningAnswerBadge({ value }: { value: ScreeningAnswer }) {
  const meta = ANSWER_META[value] ?? ANSWER_META.UNKNOWN
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center justify-center rounded-md px-2 ring-1 ring-inset',
        'text-[11px] font-semibold tracking-tight',
        meta.cls,
      )}
    >
      {meta.label}
    </span>
  )
}
