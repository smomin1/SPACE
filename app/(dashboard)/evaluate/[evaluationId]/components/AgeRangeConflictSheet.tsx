'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Role } from '@prisma/client'
import { AGE_OPTIONS, ageLabel, gradeRangeLabel } from '@/lib/age-range'

type AgeRangeEntry = {
  userId: string
  userName: string | null
  evaluatorType: string
  ageMin: number
  ageMax: number
  updatedAt: string
}

type Message = {
  id: string
  body: string
  createdAt: string
  user: { id: string; name: string | null; role: Role }
}

type Props = {
  evaluationId: string
  isClosed: boolean
  currentUserId: string
  canClose: boolean
  ageRanges: AgeRangeEntry[]
  myAgeRange: { ageMin: number; ageMax: number } | null
  onClosed: () => void
  onRangeUpdated: (ageMin: number, ageMax: number, autoClosed: boolean) => void
}

const ROLE_LABELS: Partial<Record<Role, string>> = {
  ADMIN: 'Admin',
  PEDAGOGY_EVALUATOR: 'Pedagogy',
  TECHNICAL_EVALUATOR: 'Technical',
  VIEWER: 'Viewer',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function initials(name: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AgeRangeConflictSheet({
  evaluationId,
  isClosed: initialClosed,
  currentUserId,
  canClose,
  ageRanges,
  myAgeRange,
  onClosed,
  onRangeUpdated,
}: Props) {
  const [isClosed, setIsClosed] = useState(initialClosed)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [selMin, setSelMin] = useState<number | null>(myAgeRange?.ageMin ?? null)
  const [selMax, setSelMax] = useState<number | null>(myAgeRange?.ageMax ?? null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsClosed(initialClosed)
    setLoading(true)
    fetch(`/api/evaluations/${evaluationId}/age-range-conflict/messages`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages ?? [])
        setIsClosed(data.isClosed ?? initialClosed)
      })
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false))
  }, [evaluationId, initialClosed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Sync selectors when myAgeRange changes
  useEffect(() => {
    setSelMin(myAgeRange?.ageMin ?? null)
    setSelMax(myAgeRange?.ageMax ?? null)
  }, [myAgeRange])

  async function handleSaveRange() {
    if (selMin === null || selMax === null) return
    if (selMin > selMax) {
      toast.error('Minimum age cannot exceed maximum age')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/age-range`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ageMin: selMin, ageMax: selMax }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to save')
      } else {
        toast.success('Age range updated')
        if (data.conflictAutoClosed) {
          setIsClosed(true)
          onRangeUpdated(selMin, selMax, true)
          onClosed()
        } else {
          onRangeUpdated(selMin, selMax, false)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  function handleSend() {
    const content = draft.trim()
    if (!content) return
    startTransition(async () => {
      const res = await fetch(`/api/evaluations/${evaluationId}/age-range-conflict/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to send message')
        return
      }
      setMessages(prev => [...prev, data.message])
      setDraft('')
    })
  }

  function handleClose() {
    startTransition(async () => {
      const res = await fetch(`/api/evaluations/${evaluationId}/age-range-conflict`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to close')
        return
      }
      setIsClosed(true)
      toast.success('Age range conflict marked as resolved')
      onClosed()
    })
  }

  const canUpdateRange = !isClosed && ageRanges.some(r => r.userId === currentUserId)

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl">
      {/* All submissions */}
      <div className="px-6 py-4 border-b bg-stone-50/60 shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-2.5">
          Submitted age ranges
        </p>
        <div className="space-y-2">
          {ageRanges.map(r => (
            <div key={r.userId} className="flex items-center gap-2.5">
              <span className="size-6 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-semibold text-stone-600 shrink-0">
                {initials(r.userName)}
              </span>
              <span className="text-[13px] text-stone-700 flex-1">{r.userName ?? 'Unknown'}</span>
              <span className="text-[11px] text-stone-500 capitalize">
                {r.evaluatorType.toLowerCase()}
              </span>
              <span className="text-[12px] font-medium text-blue-700 bg-blue-50 rounded px-2 py-0.5 ring-1 ring-inset ring-blue-200">
                {ageLabel(r.ageMin)} – {ageLabel(r.ageMax)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Update your range */}
      {canUpdateRange && (
        <div className="px-6 py-4 border-b shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
            Update your age range
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Conflict resolves when all evaluators agree on the same range.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">From</span>
              <Select
                value={selMin !== null ? String(selMin) : ''}
                onValueChange={v => {
                  const min = Number(v)
                  setSelMin(min)
                  if (selMax !== null && selMax < min) setSelMax(min)
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[120px]">
                  <SelectValue placeholder="Min age…" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_OPTIONS.map(age => (
                    <SelectItem key={age} value={String(age)} className="text-xs">
                      {ageLabel(age)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">to</span>
              <Select
                value={selMax !== null ? String(selMax) : ''}
                onValueChange={v => {
                  const max = Number(v)
                  setSelMax(max)
                  if (selMin !== null && selMin > max) setSelMin(max)
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[120px]">
                  <SelectValue placeholder="Max age…" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_OPTIONS.map(age => (
                    <SelectItem key={age} value={String(age)} className="text-xs">
                      {ageLabel(age)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selMin !== null && selMax !== null && (
              <span className="text-xs text-blue-600 font-medium">
                {gradeRangeLabel(selMin, selMax)}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveRange}
              disabled={
                saving ||
                selMin === null ||
                selMax === null ||
                (selMin === myAgeRange?.ageMin && selMax === myAgeRange?.ageMax)
              }
            >
              {saving ? 'Saving…' : 'Save range'}
            </Button>
            {canClose && (
              <Button size="sm" onClick={handleClose} disabled={isPending}>
                Mark as resolved
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Discussion */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-3">
        {loading && (
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No messages yet. Start the discussion.
          </p>
        )}
        {messages.map(msg => {
          const isOwn = msg.user.id === currentUserId
          return (
            <div
              key={msg.id}
              className={`rounded-lg border px-3 py-2.5 text-sm ${isOwn ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-xs">{msg.user.name ?? 'Unknown'}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {ROLE_LABELS[msg.user.role] ?? msg.user.role}
                </Badge>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply */}
      {!isClosed && (
        <div className="px-6 py-4 border-t shrink-0 space-y-2">
          <Textarea
            placeholder="Reply to the thread…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={4000}
            className="text-sm"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="ml-auto"
              onClick={handleSend}
              disabled={!draft.trim() || isPending}
            >
              Send
            </Button>
          </div>
        </div>
      )}

      {isClosed && (
        <div className="px-6 py-3 border-t bg-emerald-50/60 shrink-0">
          <p className="text-xs text-emerald-700 font-medium text-center">
            This conflict has been resolved.
          </p>
        </div>
      )}
    </div>
  )
}
