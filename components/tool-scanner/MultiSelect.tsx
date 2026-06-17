'use client'

import * as React from 'react'
import { ChevronDownIcon, CheckIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type MultiSelectOption = { value: string; label: string }

/**
 * Compact multi-select dropdown: a trigger showing "Label: N / M" that opens a
 * checkbox list with Select all / Clear. Keeps filter bars tidy when there are
 * many options.
 */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const selectedSet = new Set(selected)
  const allSelected = options.length > 0 && selected.length === options.length

  const toggle = (value: string) =>
    onChange(selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value])

  const summary =
    allSelected ? 'All' : selected.length === 0 ? 'None' : `${selected.length} of ${options.length}`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-[12.5px] text-stone-700 transition-colors hover:border-stone-300"
        >
          <span className="truncate">
            <span className="text-stone-500">{label}:</span>{' '}
            <span className="font-medium text-emerald-950">{summary}</span>
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-stone-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">{label}</span>
          <div className="flex gap-2 text-[11px]">
            <button className="font-medium text-emerald-700 hover:text-emerald-900" onClick={() => onChange(options.map((o) => o.value))}>All</button>
            <button className="font-medium text-stone-500 hover:text-stone-700" onClick={() => onChange([])}>Clear</button>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {options.map((o) => {
            const on = selectedSet.has(o.value)
            return (
              <button
                key={o.value}
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] text-stone-700 hover:bg-stone-50"
              >
                <span className={cn('flex size-4 shrink-0 items-center justify-center rounded border', on ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-stone-300 bg-white')}>
                  {on && <CheckIcon className="size-3" />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
