'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlusIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import type { ScreeningHardFail } from '@prisma/client'

type Question = {
  id: string
  num: number
  category: string
  question: string
  whatToLookFor: string | null
  hardFail: ScreeningHardFail | null
}

const HARD_FAIL_LABEL: Record<ScreeningHardFail, string> = {
  IF_YES: 'Hard-fail if Yes',
  IF_NO: 'Hard-fail if No',
}

export function ScreeningQuestionsTable({ initialData }: { initialData: Question[] }) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = React.useState<Question | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/screening-questions/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Question deleted')
        setDeleteTarget(null)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to delete question')
      }
    } finally {
      setDeleting(false)
    }
  }

  // Group by category in display order
  const categories = Array.from(new Set(initialData.map((q) => q.category)))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-stone-500">
          {initialData.length} screening question{initialData.length !== 1 ? 's' : ''} used by the
          Tool Scanner
        </p>
        <Button asChild size="sm">
          <Link href="/admin/screening-questions/new">
            <PlusIcon className="mr-1.5 size-3.5" />
            New question
          </Link>
        </Button>
      </div>

      {initialData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/30 px-6 py-12 text-center text-[13px] text-stone-500">
          No screening questions yet. Seed them or add your first above.
        </div>
      ) : (
        <div className="space-y-5">
          {categories.map((category) => {
            const catQuestions = initialData.filter((q) => q.category === category)
            return (
              <div
                key={category}
                className="overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-sm"
              >
                <div className="border-b border-stone-200/60 px-5 py-2.5">
                  <h3 className="font-serif text-[15px] tracking-tight text-emerald-950">
                    {category}
                  </h3>
                </div>
                <div className="divide-y divide-stone-200/60">
                  {catQuestions.map((q) => (
                    <div key={q.id} className="flex items-start gap-3 px-5 py-3">
                      <span className="mt-0.5 font-mono text-[11px] tabular-nums text-stone-400">
                        {q.num}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] text-emerald-950">{q.question}</span>
                          {q.hardFail && (
                            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-red-700 ring-1 ring-inset ring-red-700/25">
                              {HARD_FAIL_LABEL[q.hardFail]}
                            </span>
                          )}
                        </div>
                        {q.whatToLookFor && (
                          <p className="mt-0.5 text-[12px] text-stone-500">{q.whatToLookFor}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                          <Link href={`/admin/screening-questions/${q.id}/edit`}>
                            <PencilIcon className="size-3.5 text-stone-500" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setDeleteTarget(q)}
                        >
                          <Trash2Icon className="size-3.5 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this screening question?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the question and any answers recorded for it on past scans. This cannot
              be undone.
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
