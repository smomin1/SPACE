'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { PencilIcon, CheckIcon, XIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Level = { id: string; code: string; label: string }
type Skill = { id: string; name: string; group: string }
type Question = {
  id: string
  levelId: string
  skillId: string
  num: number
  text: string
  quickReference: string | null
  level: { code: string }
  skill: { name: string }
}

interface Props {
  questions: Question[]
  levels: Level[]
  skills: Skill[]
}

export function CefrQuestionsAdmin({ questions, levels, skills }: Props) {
  const [editing, setEditing] = React.useState<string | null>(null)
  const [drafts, setDrafts] = React.useState<Record<string, { text: string; quickReference: string }>>({})
  const [saving, setSaving] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  const [localQuestions, setLocalQuestions] = React.useState(questions)

  // Group by level
  const byLevel = React.useMemo(() => {
    const m = new Map<string, Question[]>()
    for (const q of localQuestions) {
      if (!m.has(q.levelId)) m.set(q.levelId, [])
      m.get(q.levelId)!.push(q)
    }
    return m
  }, [localQuestions])

  function startEdit(q: Question) {
    setEditing(q.id)
    setDrafts((d) => ({
      ...d,
      [q.id]: { text: q.text, quickReference: q.quickReference ?? '' },
    }))
  }

  function cancelEdit() {
    setEditing(null)
  }

  async function saveEdit(qid: string) {
    const draft = drafts[qid]
    if (!draft) return
    setSaving(true)
    try {
      const res = await fetch(`/api/cefr/questions/${qid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft.text, quickReference: draft.quickReference || null }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Save failed')
      setLocalQuestions((prev) =>
        prev.map((q) =>
          q.id === qid
            ? { ...q, text: draft.text, quickReference: draft.quickReference || null }
            : q,
        ),
      )
      setEditing(null)
      toast.success('Question updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function toggleCollapse(levelId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(levelId)) next.delete(levelId)
      else next.add(levelId)
      return next
    })
  }

  const skillById = new Map(skills.map((s) => [s.id, s]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-stone-500">
          {localQuestions.length} questions across {levels.length} CEFR levels. Click any question to edit its text or quick reference.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCollapsed(collapsed.size === levels.length ? new Set() : new Set(levels.map(l => l.id)))}
        >
          {collapsed.size === levels.length ? 'Expand all' : 'Collapse all'}
        </Button>
      </div>

      {levels.map((level) => {
        const qs = byLevel.get(level.id) ?? []
        if (qs.length === 0) return null
        const isCollapsed = collapsed.has(level.id)
        return (
          <div key={level.id} className="rounded-xl border border-stone-200/80 bg-white overflow-hidden">
            <button
              onClick={() => toggleCollapse(level.id)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-stone-50/60 transition-colors"
            >
              {isCollapsed
                ? <ChevronRightIcon className="size-3.5 text-stone-400 shrink-0" />
                : <ChevronDownIcon className="size-3.5 text-stone-400 shrink-0" />
              }
              <span className="font-mono text-[12px] font-bold text-emerald-700 uppercase tracking-wider">{level.code}</span>
              <span className="text-[13px] text-emerald-950">{level.label}</span>
              <span className="ml-auto text-[11px] text-stone-400">{qs.length} questions</span>
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-stone-100 border-t border-stone-100">
                {qs.map((q) => {
                  const skill = skillById.get(q.skillId)
                  const isEditing = editing === q.id
                  const draft = drafts[q.id]
                  return (
                    <div key={q.id} className={cn('px-4 py-3', isEditing && 'bg-stone-50/60')}>
                      <div className="flex items-start gap-3">
                        <div className="flex shrink-0 flex-col items-center gap-0.5">
                          <span className="font-mono text-[10px] text-stone-400">{level.code}</span>
                          <span className="font-mono text-[10px] text-stone-400">#{q.num}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {skill && (
                            <p className="mb-1 text-[10.5px] font-medium uppercase tracking-wider text-stone-400">
                              {skill.name}
                            </p>
                          )}
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={draft?.text ?? q.text}
                                onChange={(e) =>
                                  setDrafts((d) => ({ ...d, [q.id]: { ...d[q.id], text: e.target.value } }))
                                }
                                rows={3}
                                className="w-full rounded-md border border-stone-200 px-2.5 py-2 text-[12.5px] focus:border-emerald-400 focus:outline-none resize-none"
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-stone-500 shrink-0">Quick reference:</span>
                                <input
                                  type="text"
                                  value={draft?.quickReference ?? q.quickReference ?? ''}
                                  onChange={(e) =>
                                    setDrafts((d) => ({ ...d, [q.id]: { ...d[q.id], quickReference: e.target.value } }))
                                  }
                                  placeholder="Optional hint or reference"
                                  className="flex-1 rounded-md border border-stone-200 px-2 py-1 text-[12px] focus:border-emerald-400 focus:outline-none"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" disabled={saving} onClick={() => saveEdit(q.id)}>
                                  <CheckIcon className="size-3 mr-1" />
                                  {saving ? 'Saving…' : 'Save'}
                                </Button>
                                <Button size="sm" variant="outline" disabled={saving} onClick={cancelEdit}>
                                  <XIcon className="size-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-[13px] text-emerald-950 leading-snug">{q.text}</p>
                              {q.quickReference && (
                                <p className="mt-0.5 text-[11px] text-stone-400 italic">{q.quickReference}</p>
                              )}
                            </div>
                          )}
                        </div>
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(q)}
                            className="shrink-0 flex size-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-emerald-700 transition-colors"
                          >
                            <PencilIcon className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
