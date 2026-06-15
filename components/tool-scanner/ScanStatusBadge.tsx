import { cn } from '@/lib/utils'
import type { ScanStatus } from '@prisma/client'

const STATUS_META: Record<ScanStatus, { label: string; cls: string }> = {
  QUEUED:    { label: 'Queued',   cls: 'bg-stone-100 text-stone-600 ring-stone-300' },
  SCANNING:  { label: 'Scanning', cls: 'bg-emerald-100/80 text-emerald-900 ring-emerald-800/40' },
  COMPLETED: { label: 'Complete', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-700/30' },
  FAILED:    { label: 'Failed',   cls: 'bg-red-50 text-red-800 ring-red-700/30' },
}

export function ScanStatusBadge({ value }: { value: ScanStatus }) {
  const meta = STATUS_META[value] ?? STATUS_META.QUEUED
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center justify-center gap-1 rounded-md px-2 ring-1 ring-inset',
        'text-[11px] font-semibold tracking-tight',
        meta.cls,
      )}
    >
      {value === 'SCANNING' && (
        <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
      )}
      {meta.label}
    </span>
  )
}
