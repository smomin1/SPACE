'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { XIcon, ChevronDownIcon, CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlatformStatus } from '@prisma/client'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ContextOption  = { id: string; name: string }
type PlatformOption = { id: string; name: string; status: PlatformStatus }

export interface FilterBarProps {
  contexts:   ContextOption[]
  platforms:  PlatformOption[]
  categories: string[]
  /** Phase 6 scaffold: when true, the optional VITAL filters are shown. */
  vitalEnabled?: boolean
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'FINALISED',   label: 'Finalised' },
  { value: 'MERGED',      label: 'Merged' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
] as const

const EVIDENCE_OPTIONS = [
  { value: 'high', label: 'High confidence' },
  { value: 'low',  label: 'Low confidence' },
] as const

const EVALUATOR_TYPE_OPTIONS = [
  { value: 'PEDAGOGY',  label: 'Pedagogy' },
  { value: 'TECHNICAL', label: 'Technical' },
] as const

// Phase 6 scaffold: optional VITAL filters (rendered only when a platform is linked).
const VITAL_VERDICT_OPTIONS = [
  { value: 'STRONG_FIT',  label: 'Strong fit' },
  { value: 'GOOD_FIT',    label: 'Good fit' },
  { value: 'PARTIAL_FIT', label: 'Partial fit' },
  { value: 'POOR_FIT',    label: 'Poor fit' },
] as const

const VITAL_MIN_SCORE_OPTIONS = [
  { value: '6', label: 'VITAL ≥ 6' },
  { value: '7', label: 'VITAL ≥ 7' },
  { value: '8', label: 'VITAL ≥ 8' },
  { value: '9', label: 'VITAL ≥ 9' },
] as const

const VITAL_MAX_RISK_OPTIONS = [
  { value: 'LOW',    label: 'Risk: Low only' },
  { value: 'MEDIUM', label: 'Risk: ≤ Medium' },
] as const

// Default status when no param is present
const DEFAULT_STATUSES = ['FINALISED']

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseMultiParam(params: URLSearchParams, key: string, fallback: string[] = []): string[] {
  const raw = params.get(key)
  return raw ? raw.split(',').filter(Boolean) : fallback
}

function isDefaultStatuses(vals: string[]): boolean {
  return vals.length === DEFAULT_STATUSES.length && vals.every(v => DEFAULT_STATUSES.includes(v))
}

// ─── Main component ─────────────────────────────────────────────────────────────

export function FilterBar({ contexts, platforms, categories, vitalEnabled }: FilterBarProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  // Multi-select state (parsed from URL)
  const selectedContexts   = parseMultiParam(params, 'context')
  const selectedPlatforms  = parseMultiParam(params, 'platform')
  const selectedCategories = parseMultiParam(params, 'category')
  const selectedStatuses   = parseMultiParam(params, 'status', DEFAULT_STATUSES)

  // Single-select state
  const evalTypeValue  = params.get('evaluatorType') ?? ''
  const evidenceValue  = params.get('evidenceQuality') ?? ''
  const showDq         = params.has('showDq')

  // Phase 6 scaffold: VITAL filter state
  const vitalVerdictValue = params.get('vitalVerdict') ?? ''
  const minVital10Value   = params.get('minVital10') ?? ''
  const maxRiskValue      = params.get('maxRisk') ?? ''

  // ── Update helpers ──────────────────────────────────────────────────────────

  const push = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString()
      router.replace(pathname + (qs ? `?${qs}` : ''), { scroll: false })
    },
    [pathname, router],
  )

  const setMulti = useCallback(
    (key: string, values: string[], suppressDefault?: string[]) => {
      const next = new URLSearchParams(params.toString())
      const isDefault = suppressDefault &&
        values.length === suppressDefault.length &&
        values.every(v => suppressDefault.includes(v))
      if (values.length === 0 || isDefault) next.delete(key)
      else next.set(key, values.join(','))
      push(next)
    },
    [params, push],
  )

  const setSingle = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString())
      if (!value) next.delete(key)
      else next.set(key, value)
      push(next)
    },
    [params, push],
  )

  const toggleShowDq = useCallback(() => {
    const next = new URLSearchParams(params.toString())
    if (showDq) next.delete('showDq')
    else next.set('showDq', '1')
    push(next)
  }, [params, push, showDq])

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  // ── Active count (non-default filters) ─────────────────────────────────────

  const activeCount = [
    selectedContexts.length > 0,
    selectedPlatforms.length > 0,
    selectedCategories.length > 0,
    !isDefaultStatuses(selectedStatuses),
    !!params.get('evaluatorType'),
    !!params.get('evidenceQuality'),
    showDq,
    !!params.get('vitalVerdict'),
    !!params.get('minVital10'),
    !!params.get('maxRisk'),
  ].filter(Boolean).length

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-wrap items-center gap-2">

      {/* Context: multi-select */}
      <MultiSelect
        placeholder="All contexts"
        selected={selectedContexts}
        options={contexts.map(c => ({ value: c.id, label: c.name }))}
        onChange={vals => setMulti('context', vals)}
      />

      {/* Platform: multi-select */}
      <MultiSelect
        placeholder="All platforms"
        selected={selectedPlatforms}
        options={platforms.map(p => ({
          value: p.id,
          label: p.name,
          dim: p.status === 'DISQUALIFIED',
          suffix: p.status === 'DISQUALIFIED' ? 'DQ' : undefined,
        }))}
        onChange={vals => setMulti('platform', vals)}
      />

      {/* Category: multi-select */}
      <MultiSelect
        placeholder="All categories"
        selected={selectedCategories}
        options={categories.map(c => ({ value: c, label: c }))}
        onChange={vals => setMulti('category', vals)}
      />

      {/* Evaluator type: single-select */}
      <FilterSelect
        placeholder="All types"
        value={evalTypeValue}
        onChange={v => setSingle('evaluatorType', v)}
      >
        {EVALUATOR_TYPE_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </FilterSelect>

      {/* Evidence quality: single-select */}
      <FilterSelect
        placeholder="Any evidence"
        value={evidenceValue}
        onChange={v => setSingle('evidenceQuality', v)}
      >
        {EVIDENCE_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </FilterSelect>

      {/* VITAL filters: opt-in, only when ≥1 platform is linked to a VITAL tool */}
      {vitalEnabled && (
        <>
          <FilterSelect
            placeholder="Any VITAL verdict"
            value={vitalVerdictValue}
            onChange={v => setSingle('vitalVerdict', v)}
          >
            {VITAL_VERDICT_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect
            placeholder="Any VITAL score"
            value={minVital10Value}
            onChange={v => setSingle('minVital10', v)}
          >
            {VITAL_MIN_SCORE_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect
            placeholder="Any risk"
            value={maxRiskValue}
            onChange={v => setSingle('maxRisk', v)}
          >
            {VITAL_MAX_RISK_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </FilterSelect>
        </>
      )}

      {/* Status: multi-select, default = Finalised */}
      <MultiSelect
        placeholder="All statuses"
        selected={selectedStatuses}
        options={STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
        onChange={vals => setMulti('status', vals.length > 0 ? vals : DEFAULT_STATUSES, DEFAULT_STATUSES)}
        defaultSelected={DEFAULT_STATUSES}
      />

      {/* Show disqualified toggle */}
      <button
        onClick={toggleShowDq}
        className={cn(
          'h-8 inline-flex items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] transition-colors select-none',
          showDq
            ? 'border-destructive/30 bg-destructive/5 text-destructive'
            : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700',
        )}
      >
        <Checkbox checked={showDq} variant="destructive" />
        Show disqualified
      </button>

      {/* Clear all */}
      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
        >
          <XIcon className="size-3" />
          Clear
          <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] font-semibold">
            {activeCount}
          </Badge>
        </button>
      )}
    </div>
  )
}

// ─── MultiSelect ───────────────────────────────────────────────────────────────

type MultiSelectOption = {
  value: string
  label: string
  dim?: boolean
  suffix?: string
}

function MultiSelect({
  placeholder,
  selected,
  options,
  onChange,
  defaultSelected,
}: {
  placeholder: string
  selected: string[]
  options: MultiSelectOption[]
  onChange: (vals: string[]) => void
  defaultSelected?: string[]
}) {
  const isDefault =
    !!defaultSelected &&
    selected.length === defaultSelected.length &&
    selected.every(v => defaultSelected.includes(v))

  const isActive = selected.length > 0 && !isDefault

  const triggerLabel =
    isDefault && defaultSelected
      ? options.filter(o => defaultSelected.includes(o.value)).map(o => o.label).join(', ')
      : selected.length === 0
      ? placeholder
      : selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label ?? selected[0])
      : `${selected.length} selected`

  const allSelected = options.every(o => selected.includes(o.value))

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value]
    onChange(next)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'h-8 inline-flex items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] transition-colors',
            isActive
              ? 'border-emerald-300 bg-emerald-50/60 text-emerald-800'
              : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50',
          )}
        >
          <span className="flex-1 text-left truncate max-w-[130px]">{triggerLabel}</span>
          {isActive && selected.length > 1 && (
            <Badge className="h-4 min-w-4 px-1 text-[10px] bg-emerald-700 text-white shrink-0">
              {selected.length}
            </Badge>
          )}
          <ChevronDownIcon className="size-3.5 shrink-0 text-stone-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-1.5 max-h-72 overflow-y-auto">
        {/* Select all / Clear all */}
        <button
          onClick={() => onChange(allSelected ? [] : options.map(o => o.value))}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] text-stone-500 hover:bg-stone-100 italic"
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
        <div className="my-1 border-t border-stone-100" />

        {options.map(opt => {
          const checked = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12.5px] text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <Checkbox checked={checked} />
              <span className={cn('flex-1 text-left truncate', opt.dim && 'line-through text-stone-400')}>
                {opt.label}
              </span>
              {opt.suffix && (
                <span className="text-[10px] font-semibold text-destructive">{opt.suffix}</span>
              )}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

// ─── Shared primitives ──────────────────────────────────────────────────────────

function Checkbox({
  checked,
  variant = 'default',
}: {
  checked: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <span
      className={cn(
        'flex size-3.5 shrink-0 items-center justify-center rounded-sm border',
        checked && variant === 'default' && 'bg-emerald-700 border-emerald-700',
        checked && variant === 'destructive' && 'bg-destructive border-destructive',
        !checked && 'border-stone-300',
      )}
    >
      {checked && <CheckIcon className="size-2.5 text-white stroke-[3]" />}
    </span>
  )
}

function FilterSelect({
  placeholder,
  value,
  onChange,
  children,
}: {
  placeholder: string
  value: string
  onChange: (value: string | null) => void
  children: React.ReactNode
}) {
  return (
    <Select
      value={value || '__all__'}
      onValueChange={v => onChange(v === '__all__' ? null : v)}
    >
      <SelectTrigger
        size="sm"
        className="h-8 text-[12.5px] text-stone-600 border-stone-200 bg-white data-placeholder:text-stone-400 min-w-[112px]"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__" className="text-stone-400 italic">
          {placeholder}
        </SelectItem>
        {children}
      </SelectContent>
    </Select>
  )
}
