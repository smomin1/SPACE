import { cn } from '@/lib/utils'

const SCORE_META: Record<string, { label: string; cls: string }> = {
  '0': { label: '0', cls: 'bg-stone-100 text-stone-700 ring-stone-300' },
  '1': { label: '1', cls: 'bg-amber-50 text-amber-900 ring-amber-700/30' },
  '2': { label: '2', cls: 'bg-amber-100/80 text-amber-900 ring-amber-700/30' },
  '3': { label: '3', cls: 'bg-emerald-50 text-emerald-900 ring-emerald-700/30' },
  '4': { label: '4', cls: 'bg-emerald-100/80 text-emerald-900 ring-emerald-800/40' },
}

export function ToolScannerScoreBadge({ value }: { value: number }) {
  const key = String(Math.max(0, Math.min(4, Math.round(value))))
  const meta = SCORE_META[key] ?? SCORE_META['0']
  return (
    <span
      className={cn(
        'inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md px-1.5 ring-1 ring-inset',
        'font-mono text-[11.5px] font-medium tabular-nums',
        meta.cls,
      )}
    >
      {meta.label}
    </span>
  )
}
