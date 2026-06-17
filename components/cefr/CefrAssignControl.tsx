'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { XIcon } from 'lucide-react'

type Person = { id: string; name: string }

export function CefrAssignControl({
  platformId,
  assignees,
  evaluators,
}: {
  platformId: string
  assignees: Person[]
  evaluators: Person[]
}) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  const assignedIds = new Set(assignees.map((a) => a.id))
  const available = evaluators.filter((e) => !assignedIds.has(e.id))

  async function call(userId: string, action: 'assign' | 'remove') {
    setBusy(true)
    try {
      const res = await fetch(`/api/platforms/${platformId}/evaluators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, evaluatorType: 'VITAL', action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed')
      }
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assignees.map((a) => (
        <span key={a.id} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11.5px] text-emerald-800 ring-1 ring-inset ring-emerald-700/20">
          {a.name}
          <button disabled={busy} onClick={() => call(a.id, 'remove')} className="text-emerald-700/60 hover:text-red-600 disabled:opacity-50" aria-label={`Remove ${a.name}`}>
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      {available.length > 0 && (
        <select
          value=""
          disabled={busy}
          onChange={(e) => e.target.value && call(e.target.value, 'assign')}
          className="rounded-md border border-stone-200 bg-white px-1.5 py-1 text-[11.5px] text-stone-600"
        >
          <option value="">{assignees.length > 0 ? '+ add' : 'Assign…'}</option>
          {available.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      )}
      {assignees.length === 0 && available.length === 0 && (
        <span className="text-[11px] text-stone-400">No evaluators</span>
      )}
    </div>
  )
}
