'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { EvaluatorType, WeightLevel } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CheckIcon } from 'lucide-react'
import { TypeBadge, WeightTier, ComplianceGateBadge } from '@/components/admin/_shared/badges'

export type RequirementRow = {
  id: string
  title: string
  description: string
  evaluatorType: EvaluatorType
  weight: WeightLevel
  isComplianceGate: boolean
  category: string | null
  order: number
  assigned: boolean
  weightOverride: WeightLevel | null
}

interface RequirementMatrixProps {
  contextId: string
  contextName: string
  initialRequirements: RequirementRow[]
}

export function RequirementMatrix({ contextId, contextName, initialRequirements }: RequirementMatrixProps) {
  const router = useRouter()
  const [assignments, setAssignments] = React.useState<Record<string, boolean>>(
    Object.fromEntries(initialRequirements.map((r) => [r.id, r.assigned]))
  )
  const [weightOverrides, setWeightOverrides] = React.useState<Record<string, WeightLevel | null>>(
    Object.fromEntries(initialRequirements.map((r) => [r.id, r.weightOverride]))
  )
  const [saving, setSaving] = React.useState<Set<string>>(new Set())

  async function toggle(requirementId: string, newValue: boolean) {
    setSaving((prev) => new Set(prev).add(requirementId))
    try {
      const res = await fetch(`/api/contexts/${contextId}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          assigned: newValue,
          weightOverride: weightOverrides[requirementId] ?? null,
        }),
      })
      if (res.ok) {
        setAssignments((prev) => ({ ...prev, [requirementId]: newValue }))
        if (!newValue) {
          // Clear the override when unassigning
          setWeightOverrides((prev) => ({ ...prev, [requirementId]: null }))
        }
        router.refresh()
      } else {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Failed to update assignment.')
      }
    } finally {
      setSaving((prev) => { const next = new Set(prev); next.delete(requirementId); return next })
    }
  }

  async function setWeightOverride(requirementId: string, override: WeightLevel | null) {
    setSaving((prev) => new Set(prev).add(requirementId))
    setWeightOverrides((prev) => ({ ...prev, [requirementId]: override }))
    try {
      const res = await fetch(`/api/contexts/${contextId}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          assigned: true,
          weightOverride: override,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Failed to update weight.')
        // Revert
        setWeightOverrides((prev) => ({ ...prev, [requirementId]: initialRequirements.find(r => r.id === requirementId)?.weightOverride ?? null }))
      }
    } finally {
      setSaving((prev) => { const next = new Set(prev); next.delete(requirementId); return next })
    }
  }

  const grouped = React.useMemo(() => {
    const map = new Map<string, RequirementRow[]>()
    for (const r of initialRequirements) {
      const cat = r.category ?? 'Uncategorised'
      map.set(cat, [...(map.get(cat) ?? []), r])
    }
    return map
  }, [initialRequirements])

  const assignedCount = Object.values(assignments).filter(Boolean).length
  const totalCount = initialRequirements.length

  function selectAll() {
    initialRequirements.forEach((r) => { if (!assignments[r.id]) toggle(r.id, true) })
  }
  function clearAll() {
    initialRequirements.forEach((r) => { if (assignments[r.id]) toggle(r.id, false) })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          <span className="font-semibold text-emerald-950 tabular-nums">{assignedCount}</span> of{' '}
          <span className="font-semibold text-emerald-950 tabular-nums">{totalCount}</span> requirements assigned to{' '}
          <strong className="text-emerald-950">{contextName}</strong>
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-stone-200 text-xs text-stone-600 hover:border-stone-300 hover:bg-stone-50"
            onClick={selectAll}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-stone-200 text-xs text-stone-600 hover:border-stone-300 hover:bg-stone-50"
            onClick={clearAll}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Table */}
      {initialRequirements.length === 0 ? (
        <div className="rounded-xl border border-stone-200/80 py-16 text-center text-sm text-stone-400">
          No requirements found. Add requirements in the Requirements Master first.
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200/80 bg-white overflow-hidden">
          {/* Column headers */}
          <div className="sticky top-0 z-10 grid grid-cols-[2rem_1fr_9rem_8rem_10rem_4rem] gap-3 border-b border-stone-200/80 bg-stone-50/80 px-4 py-2.5 backdrop-blur text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
            <span />
            <span>Requirement</span>
            <span>Type</span>
            <span>Global weight</span>
            <span>Context weight</span>
            <span className="text-center">Incl.</span>
          </div>

          {Array.from(grouped.entries()).map(([category, reqs]) => (
            <div key={category}>
              {/* Category sub-header */}
              <div className="bg-stone-50/40 px-4 py-2 border-b border-stone-200/40">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  {category}
                </span>
              </div>

              {/* Requirement rows */}
              {reqs.map((req) => {
                const isAssigned = assignments[req.id] ?? false
                const isSaving = saving.has(req.id)
                return (
                  <div
                    key={req.id}
                    className={cn(
                      'grid grid-cols-[2rem_1fr_9rem_8rem_10rem_4rem] gap-3 items-center px-4 py-3 border-b border-stone-200/50 transition-colors select-none',
                      isAssigned
                        ? 'bg-emerald-900/[0.03]'
                        : 'bg-white',
                      isSaving && 'opacity-50 cursor-wait'
                    )}
                  >
                    {/* Checkbox — clicking this toggles assignment */}
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => !isSaving && toggle(req.id, !isAssigned)}
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded border-2 transition-all cursor-pointer',
                        isAssigned
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-stone-300 bg-white hover:border-stone-400'
                      )}
                    >
                      {isAssigned && <CheckIcon className="size-2.5" />}
                    </button>

                    {/* Title + description — clicking here also toggles */}
                    <div
                      className="min-w-0 cursor-pointer"
                      onClick={() => !isSaving && toggle(req.id, !isAssigned)}
                    >
                      <p className={cn('text-[13px] font-medium leading-snug', isAssigned ? 'text-emerald-950' : 'text-stone-500')}>
                        {req.title}
                      </p>
                      {req.description && (
                        <p className="mt-0.5 text-xs text-stone-400 line-clamp-2 leading-relaxed">
                          {req.description}
                        </p>
                      )}
                    </div>

                    {/* Type + gate */}
                    <div className="flex flex-wrap items-center gap-1">
                      <TypeBadge value={req.evaluatorType} />
                      {req.isComplianceGate && <ComplianceGateBadge />}
                    </div>

                    {/* Global weight (read-only) */}
                    <div>
                      <WeightTier value={req.weight} />
                    </div>

                    {/* Context weight override */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {isAssigned ? (
                        <Select
                          value={weightOverrides[req.id] ?? '__global__'}
                          onValueChange={(v) =>
                            setWeightOverride(req.id, v === '__global__' ? null : v as WeightLevel)
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="h-7 text-xs w-32 border-stone-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__global__" className="text-xs text-stone-400">
                              Use global
                            </SelectItem>
                            <SelectItem value="HIGH" className="text-xs">High (3×)</SelectItem>
                            <SelectItem value="MEDIUM" className="text-xs">Medium (2×)</SelectItem>
                            <SelectItem value="LOW" className="text-xs">Low (1×)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-stone-300">-</span>
                      )}
                    </div>

                    {/* Included indicator */}
                    <div className="flex justify-center">
                      <span className={cn(
                        'text-xs font-medium tabular-nums',
                        isAssigned ? 'text-emerald-700' : 'text-stone-300'
                      )}>
                        {isAssigned ? 'Yes' : '-'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
