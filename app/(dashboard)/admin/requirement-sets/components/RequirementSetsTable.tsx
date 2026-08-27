'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlusIcon, PencilIcon, Trash2Icon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type SetRow = {
  id: string
  key: string
  name: string
  description: string | null
  order: number
  isActive: boolean
  _count: { screeningQuestions: number; searchEvaluations: number }
}

export function RequirementSetsTable({ initialData }: { initialData: SetRow[] }) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = React.useState<SetRow | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const sorted = [...initialData].sort((a, b) => a.order - b.order)

  async function updateSet(id: string, data: Record<string, unknown>) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/requirement-sets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? 'Failed to update requirement set')
      }
    } finally {
      setBusyId(null)
    }
  }

  async function move(row: SetRow, direction: 'up' | 'down') {
    const idx = sorted.findIndex((s) => s.id === row.id)
    const neighborIdx = direction === 'up' ? idx - 1 : idx + 1
    const neighbor = sorted[neighborIdx]
    if (!neighbor) return
    setBusyId(row.id)
    try {
      await Promise.all([
        fetch(`/api/requirement-sets/${row.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: neighbor.order }),
        }),
        fetch(`/api/requirement-sets/${neighbor.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: row.order }),
        }),
      ])
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/requirement-sets/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Requirement set deleted')
        setDeleteTarget(null)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to delete requirement set')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-stone-500">
          {sorted.length} requirement set{sorted.length !== 1 ? 's' : ''}
        </p>
        <Button asChild size="sm">
          <Link href="/admin/requirement-sets/new">
            <PlusIcon className="mr-1.5 size-3.5" />
            New requirement set
          </Link>
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/30 px-6 py-12 text-center text-[13px] text-stone-500">
          No requirement sets yet. Create your first above.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-sm">
          <div className="divide-y divide-stone-200/60">
            {sorted.map((s, i) => {
              const hasData = s._count.screeningQuestions > 0 || s._count.searchEvaluations > 0
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      className="text-stone-400 hover:text-emerald-800 disabled:opacity-30"
                      disabled={i === 0 || busyId === s.id}
                      onClick={() => move(s, 'up')}
                    >
                      <ArrowUpIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="text-stone-400 hover:text-emerald-800 disabled:opacity-30"
                      disabled={i === sorted.length - 1 || busyId === s.id}
                      onClick={() => move(s, 'down')}
                    >
                      <ArrowDownIcon className="size-3.5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-emerald-950">{s.name}</span>
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-500">
                        {s.key}
                      </span>
                      {!s.isActive && (
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-stone-500 ring-1 ring-inset ring-stone-300">
                          Inactive
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-0.5 text-[12px] text-stone-500">{s.description}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-stone-400">
                      {s._count.screeningQuestions} question{s._count.screeningQuestions !== 1 ? 's' : ''} ·{' '}
                      {s._count.searchEvaluations} scan{s._count.searchEvaluations !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn('h-7 px-2.5 text-[11.5px]', s.isActive && 'border-emerald-700/30 text-emerald-800')}
                      disabled={busyId === s.id}
                      onClick={() => updateSet(s.id, { isActive: !s.isActive })}
                    >
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                      <Link href={`/admin/requirement-sets/${s.id}/edit`}>
                        <PencilIcon className="size-3.5 text-stone-500" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      disabled={hasData}
                      title={hasData ? 'Deactivate instead — this set has questions or scans attached' : undefined}
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2Icon className={cn('size-3.5', hasData ? 'text-stone-300' : 'text-red-600')} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this requirement set?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
