'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Role } from '@prisma/client'

type Author = { id: string; name: string | null; role: Role }

type Message = {
  id: string
  content: string
  createdAt: string
  author: Author
}

type Props = {
  evaluationId: string
  threadId: string
  requirementTitle: string
  isClosed: boolean
  currentUserId: string
  canClose: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed: () => void
}

const ROLE_LABELS: Partial<Record<Role, string>> = {
  ADMIN: 'Admin',
  PEDAGOGY_EVALUATOR: 'Pedagogy',
  TECHNICAL_EVALUATOR: 'Technical',
  VIEWER: 'Viewer',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ConflictThread({
  evaluationId,
  threadId,
  requirementTitle,
  isClosed: initialClosed,
  currentUserId,
  canClose,
  open,
  onOpenChange,
  onClosed,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isClosed, setIsClosed] = useState(initialClosed)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/evaluations/${evaluationId}/conflicts/${threadId}/messages`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages ?? [])
        setIsClosed(data.isClosed ?? initialClosed)
      })
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false))
  }, [open, evaluationId, threadId, initialClosed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="flex flex-col max-h-[80vh] sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="text-base leading-tight flex-1">
              {requirementTitle}
            </DialogTitle>
            <Badge variant={isClosed ? 'secondary' : 'destructive'} className="shrink-0">
              {isClosed ? 'Resolved' : 'Conflict'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 py-2 pr-1">
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

        {!isClosed && (
          <div className="border-t pt-3 space-y-2">
            <Textarea
              placeholder="Write a message…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              maxLength={4000}
              className="text-sm"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
              }}
            />
            <div className="flex items-center justify-between gap-2">
              {canClose && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Mark Resolved
                </Button>
              )}
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
      </DialogContent>
    </Dialog>
  )
}
