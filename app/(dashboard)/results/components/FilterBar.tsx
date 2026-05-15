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
import { Badge } from '@/components/ui/badge'
import { XIcon } from 'lucide-react'
import type { PlatformStatus } from '@prisma/client'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ContextOption = { id: string; name: string }
type PlatformOption = { id: string; name: string; status: PlatformStatus }

interface FilterBarProps {
  contexts: ContextOption[]
  platforms: PlatformOption[]
  categories: string[]
}

// ─── Static option sets ────────────────────────────────────────────────────────

const EVALUATOR_TYPES = [
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'PEDAGOGY',   label: 'Pedagogy' },
  { value: 'TECHNICAL',  label: 'Technical' },
] as const

const EVIDENCE_QUALITY_OPTIONS = [
  { value: 'high', label: 'High confidence' },
  { value: 'low',  label: 'Low confidence' },
] as const

const EVALUATION_STATUS_OPTIONS = [
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'MERGED',      label: 'Merged' },
  { value: 'FINALISED',   label: 'Finalised' },
] as const

// URL param keys
const PARAM_KEYS = [
  'context',
  'platform',
  'category',
  'evaluatorType',
  'evidenceQuality',
  'status',
] as const
type ParamKey = (typeof PARAM_KEYS)[number]

// ─── Component ─────────────────────────────────────────────────────────────────

export function FilterBar({ contexts, platforms, categories }: FilterBarProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const get = (key: ParamKey) => params.get(key) ?? ''

  const activeCount = PARAM_KEYS.filter((k) => params.has(k)).length

  const update = useCallback(
    (key: ParamKey, value: string | null) => {
      const next = new URLSearchParams(params.toString())
      if (!value) {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      const qs = next.toString()
      router.replace(pathname + (qs ? `?${qs}` : ''), { scroll: false })
    },
    [params, pathname, router],
  )

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Context */}
      <FilterSelect
        placeholder="All contexts"
        value={get('context')}
        onChange={(v) => update('context', v)}
      >
        {contexts.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </FilterSelect>

      {/* Platform */}
      <FilterSelect
        placeholder="All platforms"
        value={get('platform')}
        onChange={(v) => update('platform', v)}
      >
        {platforms.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <span className={p.status === 'DISQUALIFIED' ? 'line-through text-stone-400' : undefined}>
              {p.name}
            </span>
            {p.status === 'DISQUALIFIED' && (
              <span className="ml-1.5 text-[10px] text-destructive font-medium">DQ</span>
            )}
          </SelectItem>
        ))}
      </FilterSelect>

      {/* Category */}
      <FilterSelect
        placeholder="All categories"
        value={get('category')}
        onChange={(v) => update('category', v)}
      >
        {categories.map((cat) => (
          <SelectItem key={cat} value={cat}>
            {cat}
          </SelectItem>
        ))}
      </FilterSelect>

      {/* Evaluator type */}
      <FilterSelect
        placeholder="All types"
        value={get('evaluatorType')}
        onChange={(v) => update('evaluatorType', v)}
      >
        {EVALUATOR_TYPES.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </FilterSelect>

      {/* Evidence quality */}
      <FilterSelect
        placeholder="Any evidence"
        value={get('evidenceQuality')}
        onChange={(v) => update('evidenceQuality', v)}
      >
        {EVIDENCE_QUALITY_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </FilterSelect>

      {/* Evaluation status */}
      <FilterSelect
        placeholder="Any status"
        value={get('status')}
        onChange={(v) => update('status', v)}
      >
        {EVALUATION_STATUS_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </FilterSelect>

      {/* Active filter count + clear */}
      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
        >
          <XIcon className="size-3" />
          Clear
          <Badge
            variant="secondary"
            className="h-4 min-w-4 px-1 text-[10px] font-semibold"
          >
            {activeCount}
          </Badge>
        </button>
      )}
    </div>
  )
}

// ─── Shared select wrapper ─────────────────────────────────────────────────────

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
      onValueChange={(v) => onChange(v === '__all__' ? null : v)}
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
