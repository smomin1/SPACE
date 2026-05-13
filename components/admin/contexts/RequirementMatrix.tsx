'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { EvaluatorType, WeightLevel } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckIcon } from 'lucide-react'

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

const TYPE_CLS: Record<string, string> = {
  COMPLIANCE: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PEDAGOGY:   'bg-blue-100  text-blue-700  dark:bg-blue-900/50  dark:text-blue-300',
  TECHNICAL:  'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
}
const WEIGHT_CLS: Record<string, string> = {
  HIGH:   'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  LOW:    'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',
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
      setSaving((prev) => { const next = new Set(prev); next.delete(requirementId); return next })
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
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{assignedCount}</span> of{' '}
          <span className="font-semibold text-foreground">{totalCount}</span> requirements assigned to{' '}
          <strong>{contextName}</strong>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
          <Button variant="outline" size="sm" onClick={clearAll}>Clear All</Button>
        </div>
      </div>

      {/* Table */}
      {initialRequirements.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-muted-foreground">
          No requirements found. Add requirements in the Requirements Master first.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {/* Sticky column headers */}
          <div className="sticky top-0 z-10 grid grid-cols-[2rem_1fr_7rem_6rem_5rem] gap-3 border-b bg-muted/80 px-4 py-2.5 backdrop-blur text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span />
            <span>Requirement</span>
            <span>Type</span>
            <span>Weight</span>
            <span className="text-center">Included</span>
          </div>

          {Array.from(grouped.entries()).map(([category, reqs]) => (
            <div key={category}>
              {/* Category sub-header */}
              <div className="bg-muted/30 px-4 py-2 border-b border-dashed border-border/60">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {category}
                </span>
              </div>

              {/* Requirement rows */}
              {reqs.map((req) => {
                const isAssigned = assignments[req.id] ?? false
                const isSaving  = saving.has(req.id)
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
                      'grid grid-cols-[2rem_1fr_7rem_6rem_5rem] gap-3 items-center px-4 py-3 border-b border-border/40 cursor-pointer transition-colors select-none',
                      isAssigned
                        ? 'bg-primary/5 hover:bg-primary/10'
                        : 'bg-background hover:bg-muted/40',
                      isSaving && 'opacity-50 cursor-wait'
                    )}
                  >
                    {/* Checkbox column */}
                    <div className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                      isAssigned
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background'
                    )}>
                      {isAssigned && <CheckIcon className="size-3" />}
                    </div>

                    {/* Title + description */}
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium leading-snug', !isAssigned && 'text-muted-foreground')}>
                        {req.title}
                      </p>
                      {req.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {req.description}
                        </p>
                      )}
                    </div>

                    {/* Type badge */}
                    <div>
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', TYPE_CLS[req.evaluatorType])}>
                        {req.evaluatorType.charAt(0) + req.evaluatorType.slice(1).toLowerCase()}
                      </span>
                      {req.isComplianceGate && (
                        <span className="ml-1 inline-flex rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                          Gate
                        </span>
                      )}
                    </div>

                    {/* Weight badge */}
                    <div>
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', WEIGHT_CLS[req.weight])}>
                        {req.weight.charAt(0) + req.weight.slice(1).toLowerCase()}
                      </span>
                    </div>

                    {/* Included indicator */}
                    <div className="flex justify-center">
                      <span className={cn(
                        'text-xs font-medium',
                        isAssigned ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {isAssigned ? 'Yes' : '—'}
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
