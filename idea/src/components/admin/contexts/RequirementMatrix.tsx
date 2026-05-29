'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { EvaluatorType, WeightLevel } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckIcon } from 'lucide-react'
import {
  ComplianceGateBadge,
  TypeBadge,
  WeightTier,
} from '@/components/admin/_shared/badges'

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
}

interface RequirementMatrixProps {
  contextId: string
  contextName: string
  initialRequirements: RequirementRow[]
}

export function RequirementMatrix({
  contextId,
  contextName,
  initialRequirements,
}: RequirementMatrixProps) {
  const router = useRouter()
  const [assignments, setAssignments] = React.useState<Record<string, boolean>>(
    Object.fromEntries(initialRequirements.map((r) => [r.id, r.assigned])),
  )
  const [saving, setSaving] = React.useState<Set<string>>(new Set())

  async function toggle(requirementId: string, newValue: boolean) {
    setSaving((prev) => new Set(prev).add(requirementId))
    try {
      const res = await fetch(`/api/contexts/${contextId}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId, assigned: newValue }),
      })
      if (res.ok) {
        setAssignments((prev) => ({ ...prev, [requirementId]: newValue }))
        router.refresh()
      } else {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Failed to update assignment.')
      }
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(requirementId)
        return next
      })
    }
  }

  // Group by category
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
  const gatesTotal = initialRequirements.filter((r) => r.isComplianceGate).length
  const gatesAssigned = initialRequirements.filter(
    (r) => r.isComplianceGate && assignments[r.id],
  ).length
  const pedagogyAssigned = initialRequirements.filter(
    (r) => r.evaluatorType === 'PEDAGOGY' && assignments[r.id],
  ).length
  const technicalAssigned = initialRequirements.filter(
    (r) => r.evaluatorType === 'TECHNICAL' && assignments[r.id],
  ).length

  function selectAll() {
    initialRequirements.forEach((r) => {
      if (!assignments[r.id]) toggle(r.id, true)
    })
  }
  function clearAll() {
    initialRequirements.forEach((r) => {
      if (assignments[r.id]) toggle(r.id, false)
    })
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-stone-600">
          Tick the requirements that apply to{' '}
          <strong className="font-medium text-emerald-950">{contextName}</strong>. Compliance gates
          should always be considered — a failure on a gate disqualifies the platform.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear all
          </Button>
          <Button size="sm" onClick={selectAll}>
            Select all
          </Button>
        </div>
      </div>

      {/* Summary band */}
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-stone-200/80 bg-stone-200/80">
        <SummaryStat label="Assigned" value={assignedCount} sub={`of ${totalCount} requirements`} />
        <SummaryStat
          label="Compliance gates"
          value={gatesAssigned}
          sub={`of ${gatesTotal} active`}
          accent="amber"
        />
        <SummaryStat label="Pedagogy" value={pedagogyAssigned} sub="requirements" />
        <SummaryStat label="Technical" value={technicalAssigned} sub="requirements" />
      </div>

      {/* Matrix */}
      {initialRequirements.length === 0 ? (
        <div className="rounded-xl border border-stone-200/80 bg-white px-6 py-16 text-center">
          <p className="text-[13.5px] text-stone-500">
            No requirements found. Add requirements in the Requirements Master first.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
          {/* Column headers */}
          <div className="sticky top-0 z-10 grid grid-cols-[2.5rem_1fr_9rem_9rem_5rem] items-center gap-3 border-b border-stone-200/80 bg-stone-50/70 px-4 py-2.5 backdrop-blur">
            <span />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-emerald-950/55">
              Requirement
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-emerald-950/55">
              Type
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-emerald-950/55">
              Weight
            </span>
            <span className="text-center text-[10.5px] font-semibold uppercase tracking-[0.1em] text-emerald-950/55">
              Included
            </span>
          </div>

          {Array.from(grouped.entries()).map(([category, reqs]) => {
            const catAssigned = reqs.filter((r) => assignments[r.id]).length
            return (
              <div key={category}>
                {/* Category sub-header */}
                <div className="flex items-baseline justify-between border-b border-dashed border-stone-200 bg-stone-50/40 px-4 py-2">
                  <span className="font-serif text-[13px] italic text-emerald-900/80">{category}</span>
                  <span className="font-mono text-[11px] tabular-nums text-stone-500">
                    {catAssigned}/{reqs.length}
                  </span>
                </div>

                {reqs.map((req) => {
                  const isAssigned = assignments[req.id] ?? false
                  const isSaving = saving.has(req.id)
                  return (
                    <div
                      key={req.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => !isSaving && toggle(req.id, !isAssigned)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !isSaving) {
                          e.preventDefault()
                          toggle(req.id, !isAssigned)
                        }
                      }}
                      className={cn(
                        'grid grid-cols-[2.5rem_1fr_9rem_9rem_5rem] cursor-pointer select-none items-center gap-3 border-b border-stone-200/60 px-4 py-3 transition-colors',
                        isAssigned
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                          : 'bg-white hover:bg-stone-50/70',
                        isSaving && 'cursor-wait opacity-50',
                      )}
                    >
                      {/* Custom checkbox */}
                      <div className="flex justify-start">
                        <span
                          className={cn(
                            'flex size-[18px] items-center justify-center rounded-[5px] border-[1.5px] transition-all',
                            isAssigned
                              ? 'border-emerald-800 bg-emerald-700 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset]'
                              : 'border-stone-300/90 bg-white',
                          )}
                        >
                          {isAssigned && <CheckIcon className="size-3" strokeWidth={3} />}
                        </span>
                      </div>

                      {/* Title + description */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              'text-[13.5px] leading-snug',
                              isAssigned ? 'font-medium text-emerald-950' : 'text-emerald-950/65',
                            )}
                          >
                            {req.title}
                          </p>
                          {req.isComplianceGate && <ComplianceGateBadge />}
                        </div>
                        {req.description && (
                          <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-stone-500">
                            {req.description}
                          </p>
                        )}
                      </div>

                      {/* Type */}
                      <div><TypeBadge value={req.evaluatorType} /></div>

                      {/* Weight */}
                      <div><WeightTier value={req.weight} /></div>

                      {/* Included indicator */}
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            'text-[12px] font-medium',
                            isAssigned ? 'text-emerald-800' : 'text-stone-400',
                          )}
                        >
                          {isAssigned ? 'Yes' : '—'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SummaryStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number | string
  sub: string
  accent?: 'amber'
}) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 font-serif text-[26px] leading-none tracking-tight tabular-nums',
          accent === 'amber' ? 'text-amber-900' : 'text-emerald-950',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[12px] text-stone-500">{sub}</p>
    </div>
  )
}
