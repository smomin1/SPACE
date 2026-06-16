'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { CefrAnswer, CefrSkillGroup } from '@prisma/client'
import { alignmentPercent } from '@/lib/cefr'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Level = { id: string; code: string; label: string }
type Skill = { id: string; name: string; group: CefrSkillGroup }
type Question = {
  id: string
  levelId: string
  skillId: string
  num: number
  text: string
  quickReference: string | null
}
type ResponseState = { answer: CefrAnswer; fitConfidence: number | null; notes: string | null }

interface Props {
  platformId: string
  platformName: string
  levels: Level[]
  skills: Skill[]
  questions: Question[]
  initialResponses: Record<string, ResponseState>
  initialStatus: 'NONE' | 'DRAFT' | 'COMPLETED'
}

const ANSWERS: { value: CefrAnswer; label: string; on: string }[] = [
  { value: 'YES', label: 'Yes', on: 'bg-emerald-600 text-white ring-emerald-600' },
  { value: 'PARTIAL', label: 'Partial', on: 'bg-amber-500 text-white ring-amber-500' },
  { value: 'NO', label: 'No', on: 'bg-red-500 text-white ring-red-500' },
  { value: 'NA', label: 'N/A', on: 'bg-stone-400 text-white ring-stone-400' },
]

function scoreColor(pct: number): string {
  if (pct >= 70) return 'text-emerald-700'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

export function CefrEvaluatorWorkspace({
  platformId,
  platformName,
  levels,
  skills,
  questions,
  initialResponses,
  initialStatus,
}: Props) {
  const router = useRouter()
  const [responses, setResponses] = React.useState<Record<string, ResponseState>>(() => {
    const seed: Record<string, ResponseState> = {}
    for (const q of questions) {
      seed[q.id] = initialResponses[q.id] ?? { answer: 'NA', fitConfidence: null, notes: null }
    }
    return seed
  })
  const [saving, setSaving] = React.useState(false)
  const [status, setStatus] = React.useState(initialStatus)

  const skillById = React.useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills])
  const questionsByLevel = React.useMemo(() => {
    const m = new Map<string, Question[]>()
    for (const q of questions) {
      if (!m.has(q.levelId)) m.set(q.levelId, [])
      m.get(q.levelId)!.push(q)
    }
    return m
  }, [questions])

  const allResponses = React.useMemo(
    () => questions.map((q) => ({ questionId: q.id, answer: responses[q.id].answer })),
    [questions, responses],
  )
  const overallPct = alignmentPercent(allResponses)

  const levelPct = React.useCallback(
    (levelId: string) => {
      const qs = questionsByLevel.get(levelId) ?? []
      return alignmentPercent(qs.map((q) => ({ answer: responses[q.id].answer })))
    },
    [questionsByLevel, responses],
  )

  function setAnswer(qid: string, answer: CefrAnswer) {
    setResponses((prev) => ({ ...prev, [qid]: { ...prev[qid], answer } }))
  }
  function setFit(qid: string, fit: number | null) {
    setResponses((prev) => ({ ...prev, [qid]: { ...prev[qid], fitConfidence: fit } }))
  }
  function setNotes(qid: string, notes: string) {
    setResponses((prev) => ({ ...prev, [qid]: { ...prev[qid], notes: notes || null } }))
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      const res = await fetch('/api/cefr/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId,
          status: 'COMPLETED',
          responses: questions.map((q) => ({
            questionId: q.id,
            answer: responses[q.id].answer,
            fitConfidence: responses[q.id].fitConfidence,
            notes: responses[q.id].notes,
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Request failed (${res.status})`)
      }
      const data = await res.json()
      setStatus('COMPLETED')
      toast.success(`CEFR evaluation saved — ${Number(data.alignmentPct ?? 0).toFixed(1)}% alignment`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Sticky summary / submit bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-xl border border-stone-200/80 bg-white/95 px-5 py-3 shadow-sm backdrop-blur">
        <div>
          <p className="text-[12.5px] text-stone-500">
            Overall CEFR alignment for <span className="font-medium text-emerald-950">{platformName}</span>
            {status === 'COMPLETED' && <span className="ml-2 text-[11px] text-emerald-700">• saved</span>}
          </p>
          <p className={cn('font-serif text-[28px] tabular-nums tracking-tight', scoreColor(overallPct))}>
            {overallPct.toFixed(1)}%
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : status === 'NONE' ? 'Submit Evaluation' : 'Save Changes'}
        </Button>
      </div>

      <p className="text-[12px] text-stone-500">
        Score each question. <strong>N/A</strong> is excluded from the alignment %. Yes = 2,
        Partial = 1, No = 0.
      </p>

      {/* Levels */}
      {levels.map((level, i) => {
        const qs = questionsByLevel.get(level.id) ?? []
        if (qs.length === 0) return null
        const pct = levelPct(level.id)
        // Group this level's questions by skill, in question order
        const bySkill = new Map<string, Question[]>()
        for (const q of qs) {
          if (!bySkill.has(q.skillId)) bySkill.set(q.skillId, [])
          bySkill.get(q.skillId)!.push(q)
        }
        return (
          <details key={level.id} open={i === 0} className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
            <summary className="flex cursor-pointer items-center justify-between gap-3 border-b border-stone-200/60 px-5 py-3 marker:content-['']">
              <h3 className="font-serif text-[16px] tracking-tight text-emerald-950">Level {level.code}</h3>
              <span className={cn('font-mono text-[12px] tabular-nums', scoreColor(pct))}>{pct.toFixed(0)}%</span>
            </summary>
            <div className="divide-y divide-stone-200/60">
              {[...bySkill.entries()].map(([skillId, skillQs]) => {
                const skill = skillById.get(skillId)
                return (
                  <div key={skillId} className="px-5 py-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold text-emerald-950">{skill?.name}</span>
                      {skillQs[0]?.quickReference && (
                        <span className="text-[11px] text-stone-400">· {skillQs[0].quickReference}</span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {skillQs.map((q) => {
                        const r = responses[q.id]
                        return (
                          <div key={q.id} className="rounded-lg bg-stone-50/50 p-3">
                            <p className="text-[12.5px] text-stone-700">{q.text}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <div className="inline-flex overflow-hidden rounded-md ring-1 ring-stone-200">
                                {ANSWERS.map((a) => (
                                  <button
                                    key={a.value}
                                    type="button"
                                    onClick={() => setAnswer(q.id, a.value)}
                                    className={cn(
                                      'px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                                      r.answer === a.value ? a.on : 'bg-white text-stone-500 hover:bg-stone-100',
                                    )}
                                  >
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                              <label className="flex items-center gap-1.5 text-[11px] text-stone-500">
                                Fit
                                <select
                                  value={r.fitConfidence ?? ''}
                                  onChange={(e) => setFit(q.id, e.target.value ? Number(e.target.value) : null)}
                                  className="rounded-md border border-stone-200 bg-white px-1.5 py-1 text-[11.5px]"
                                >
                                  <option value="">—</option>
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </label>
                              <input
                                type="text"
                                value={r.notes ?? ''}
                                onChange={(e) => setNotes(q.id, e.target.value)}
                                placeholder="Notes / evidence (optional)"
                                className="min-w-[180px] flex-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11.5px]"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        )
      })}
    </div>
  )
}
