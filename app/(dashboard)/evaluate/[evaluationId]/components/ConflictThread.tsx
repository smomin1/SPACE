'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { Role } from '@prisma/client'
import { ROLE_SHORT_LABELS } from '@/lib/roles'

type Author = { id: string; name: string | null; role: Role }

type Message = {
  id: string
  content: string
  createdAt: string
  author: Author
}

type EvaluatorScore = {
  userId: string
  userName: string | null
  value: number | null
  evidenceType: string | null
  updatedAt: string
}

type Props = {
  evaluationId: string
  requirementId: string
  threadId: string
  isClosed: boolean
  currentUserId: string
  canClose: boolean
  canScore: boolean
  isLead: boolean
  evaluatorScores: EvaluatorScore[]
  myScore: { value: number | null; evidenceType: string | null; comment: string | null } | null
  onClosed: () => void
  onScoreUpdated: (newValue: number | null, threadAutoClosed: boolean) => void
}

const ROLE_LABELS = ROLE_SHORT_LABELS

const SCORE_BUTTONS = [
  { label: 'N/A', value: null },
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
]

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
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export function ConflictThread({
  evaluationId,
  requirementId,
  threadId,
  isClosed: initialClosed,
  currentUserId,
  canClose,
  canScore,
  isLead,
  evaluatorScores,
  myScore,
  onClosed,
  onScoreUpdated,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isClosed, setIsClosed] = useState(initialClosed)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedScore, setSelectedScore] = useState<number | null>(myScore?.value ?? null)
  const [savingScore, setSavingScore] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsClosed(initialClosed)
    setLoading(true)
    fetch(`/api/evaluations/${evaluationId}/conflicts/${threadId}/messages`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages ?? [])
        setIsClosed(data.isClosed ?? initialClosed)
      })
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false))
  }, [evaluationId, threadId, initialClosed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Sync selectedScore when myScore changes (e.g. sheet reopened for different requirement)
  useEffect(() => {
    setSelectedScore(myScore?.value ?? null)
  }, [myScore])

  async function handleScoreSave() {
    setSavingScore(true)
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          value: selectedScore,
          evidenceType: myScore?.evidenceType ?? null,
          comment: myScore?.comment ?? null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to save score')
      } else {
        toast.success('Score updated')
        onScoreUpdated(selectedScore, data.threadAutoClosed ?? false)
      }
    } finally {
      setSavingScore(false)
    }
  }

  async function handleFinalize() {
    setSavingScore(true)
    try {
      const scoreRes = await fetch(`/api/evaluations/${evaluationId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          value: selectedScore,
          evidenceType: myScore?.evidenceType ?? null,
          comment: myScore?.comment ?? null,
        }),
      })
      if (!scoreRes.ok) {
        const d = await scoreRes.json().catch(() => ({}))
        toast.error(d.error ?? 'Failed to save score')
        return
      }
      const scoreData = await scoreRes.json()

      const closeRes = await fetch(`/api/evaluations/${evaluationId}/conflicts/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      })
      if (!closeRes.ok) {
        const d = await closeRes.json().catch(() => ({}))
        toast.error(d.error ?? 'Failed to close thread')
        return
      }
      toast.success('Score finalized and thread resolved')
      setIsClosed(true)
      onScoreUpdated(selectedScore, scoreData.threadAutoClosed ?? false)
      onClosed()
    } finally {
      setSavingScore(false)
    }
  }

  function handleSend() {
    const content = draft.trim()
    if (!content) return
    startTransition(async () => {
      const res = await fetch(
        `/api/evaluations/${evaluationId}/conflicts/${threadId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        },
      )
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
      const res = await fetch(
        `/api/evaluations/${evaluationId}/conflicts/${threadId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'close' }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to close thread')
        return
      }
      setIsClosed(true)
      toast.success('Thread marked as resolved')
      onClosed()
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl">
      {/* Submitted scores */}
      <div className="px-6 py-4 border-b bg-stone-50/60 shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-2.5">
          Submitted scores
        </p>
        <div className="space-y-2">
          {evaluatorScores.map(s => (
            <div key={s.userId} className="flex items-center gap-2.5">
              <span className="size-6 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-semibold text-stone-600 shrink-0">
                {initials(s.userName)}
              </span>
              <span className="text-[13px] text-stone-700 flex-1">{s.userName ?? 'Unknown'}</span>
              <span className={`min-w-[1.5rem] text-center rounded-md px-2 py-0.5 text-[12px] font-semibold ${
                s.value === null ? 'bg-stone-100 text-stone-400' :
                s.value === 0 ? 'bg-red-50 text-red-700' :
                'bg-emerald-50 text-emerald-800'
              }`}>
                {s.value === null ? 'N/A' : s.value}
              </span>
              {s.evidenceType && (
                <span className="text-[11px] text-stone-400 capitalize">
                  {s.evidenceType.replace('_', ' ').toLowerCase()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Update your score */}
      {canScore && !isClosed && (
        <div className="px-6 py-4 border-b shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
            Update your score
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Conflicts resolve when scores converge naturally. The system never auto-averages.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {SCORE_BUTTONS.map(btn => (
              <button
                key={String(btn.value)}
                onClick={() => setSelectedScore(btn.value)}
                className={`min-w-[2.5rem] rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedScore === btn.value
                    ? btn.value === 0
                      ? 'border-destructive bg-destructive text-destructive-foreground'
                      : 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-accent'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleScoreSave}
              disabled={savingScore || selectedScore === myScore?.value}
            >
              {savingScore ? 'Saving…' : 'Save score'}
            </Button>
            {isLead && canClose && (
              <Button
                size="sm"
                onClick={handleFinalize}
                disabled={savingScore}
              >
                Finalize Score
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Audit trail */}
      <div className="px-6 py-3 border-b bg-stone-50/40 shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-2">
          Audit trail
        </p>
        <div className="space-y-1">
          {evaluatorScores.map(s => (
            <p key={s.userId} className="text-[11.5px] text-stone-500">
              <span className="font-medium text-stone-700">
                {s.userName?.split(' ')[0] ?? '?'}
              </span>
              {' submitted score '}
              <span className="font-medium">{s.value ?? 'N/A'}</span>
              {' - '}
              {formatTime(s.updatedAt)}
            </p>
          ))}
        </div>
      </div>

      {/* Discussion messages */}
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
          const isOwn = msg.author.id === currentUserId
          return (
            <div
              key={msg.id}
              className={`rounded-lg border px-3 py-2.5 text-sm ${
                isOwn ? 'bg-primary/5 border-primary/20' : 'bg-card'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-xs">{msg.author.name ?? 'Unknown'}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {ROLE_LABELS[msg.author.role] ?? msg.author.role}
                </Badge>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply + resolve */}
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
