'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { PipelineStage, PipelineStageStatus } from '@prisma/client'
import { STAGE_ORDER, STAGE_LABELS } from '@/lib/pipeline'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PipelineDiagram } from './PipelineDiagram'

type StageView = {
  stage: PipelineStage
  status: PipelineStageStatus
  score: number | null
  threshold: number
}
export type PipelineRow = {
  platformId: string
  name: string
  vendor: string
  stages: StageView[]
  aggregate: number
  complete: boolean
}
type Config = {
  aiThreshold: number; cefrThreshold: number; vitalThreshold: number; prdThreshold: number
  aiWeight: number; cefrWeight: number; vitalWeight: number; prdWeight: number
}
type Scan = { id: string; platformName: string; url: string }
type VitalTool = { id: string; name: string; v2Percent: number | null }

const STATUS_STYLE: Record<PipelineStageStatus, string> = {
  PASSED: 'bg-emerald-100 text-emerald-800 ring-emerald-700/30',
  FAILED: 'bg-red-100 text-red-800 ring-red-700/30',
  QUEUED: 'bg-amber-100 text-amber-800 ring-amber-700/30',
  IN_PROGRESS: 'bg-sky-100 text-sky-800 ring-sky-700/30',
  SKIPPED: 'bg-stone-200 text-stone-600 ring-stone-400/40',
  NOT_STARTED: 'bg-stone-100 text-stone-400 ring-stone-300',
}
const STATUS_LABEL: Record<PipelineStageStatus, string> = {
  PASSED: 'Passed', FAILED: 'Failed', QUEUED: 'Queued', IN_PROGRESS: 'In progress',
  SKIPPED: 'Skipped', NOT_STARTED: 'Not started',
}

function aggColor(pct: number): string {
  if (pct >= 70) return 'text-emerald-700'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

export function PipelineBoard({
  rows,
  config,
  unlinkedScans,
  unlinkedVitalTools = [],
}: {
  rows: PipelineRow[]
  config: Config
  unlinkedScans: Scan[]
  unlinkedVitalTools?: VitalTool[]
}) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  // Per-platform link panel open state: key = `${platformId}-${stage}`
  const [openLink, setOpenLink] = React.useState<string | null>(null)

  async function act(body: Record<string, unknown>) {
    setBusy(true)
    setOpenLink(null)
    try {
      const res = await fetch('/api/pipeline/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Action failed')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  function toggleLink(platformId: string, stage: PipelineStage) {
    const key = `${platformId}-${stage}`
    setOpenLink((prev) => (prev === key ? null : key))
  }

  // Which stages support linking and what options exist
  function linkOptions(stage: PipelineStage): boolean {
    if (stage === 'AI_SCREENING') return unlinkedScans.length > 0
    if (stage === 'VITAL') return unlinkedVitalTools.length > 0
    return false
  }

  return (
    <div className="space-y-6">
      <ConfigEditor config={config} disabled={busy} />

      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-stone-500">
          Stages run AI Screening → CEFR → VITAL → PRD. Passing a stage&apos;s threshold auto-queues
          the next. Aggregate weights are renormalised over completed stages.
        </p>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => act({ type: 'sync-all' })}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200/80 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-stone-50/60">
              <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Platform</th>
              {STAGE_ORDER.map((s) => (
                <th key={s} className="px-3 py-2.5 text-center text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                  {STAGE_LABELS[s]}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Aggregate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/60">
            {rows.map((row) => (
              <React.Fragment key={row.platformId}>
                <tr className="hover:bg-stone-50/40">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-emerald-950">{row.name}</div>
                    <div className="text-[11px] text-stone-400">{row.vendor}</div>
                  </td>
                  {row.stages.map((st) => {
                    const linkKey = `${row.platformId}-${st.stage}`
                    const hasLinkOptions = linkOptions(st.stage)
                    return (
                      <td key={st.stage} className="px-3 py-2.5 text-center">
                        <span className={cn('inline-flex h-[20px] items-center rounded-md px-1.5 text-[10.5px] font-semibold ring-1 ring-inset', STATUS_STYLE[st.status])}>
                          {STATUS_LABEL[st.status]}
                        </span>
                        <div className="mt-1 font-mono text-[11px] tabular-nums text-stone-500">
                          {st.score != null ? `${st.score.toFixed(0)}%` : '-'}
                        </div>
                        <div className="mt-0.5 flex items-center justify-center gap-2">
                          <button
                            disabled={busy}
                            onClick={() => act({ type: st.status === 'SKIPPED' ? 'unskip' : 'skip', platformId: row.platformId, stage: st.stage })}
                            className="text-[10px] text-stone-400 hover:text-emerald-700 disabled:opacity-50"
                          >
                            {st.status === 'SKIPPED' ? 'un-skip' : 'skip'}
                          </button>
                          {hasLinkOptions && (
                            <>
                              <span className="text-stone-200">·</span>
                              <button
                                disabled={busy}
                                onClick={() => toggleLink(row.platformId, st.stage)}
                                className={cn(
                                  'text-[10px] disabled:opacity-50',
                                  openLink === linkKey ? 'text-emerald-700' : 'text-stone-400 hover:text-emerald-700',
                                )}
                              >
                                link
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-right">
                    <div className={cn('font-serif text-[18px] tabular-nums', aggColor(row.aggregate))}>
                      {row.aggregate.toFixed(1)}%
                    </div>
                    {row.complete && (
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Complete</div>
                    )}
                  </td>
                </tr>

                {/* Inline link panel - rendered as a full-width row when open */}
                {row.stages.map((st) => {
                  const linkKey = `${row.platformId}-${st.stage}`
                  if (openLink !== linkKey) return null
                  return (
                    <tr key={`link-${linkKey}`} className="bg-stone-50/60">
                      <td colSpan={STAGE_ORDER.length + 2} className="px-4 py-3">
                        {st.stage === 'AI_SCREENING' && (
                          <LinkPanel
                            label="Link an existing AI screening"
                            options={unlinkedScans.map((s) => ({ id: s.id, label: s.platformName }))}
                            disabled={busy}
                            onLink={(sourceId) => act({ type: 'link', platformId: row.platformId, searchEvaluationId: sourceId })}
                          />
                        )}
                        {st.stage === 'VITAL' && (
                          <LinkPanel
                            label="Link an existing VITAL assessment"
                            options={unlinkedVitalTools.map((v) => ({
                              id: v.id,
                              label: `${v.name}${v.v2Percent != null ? ` (${v.v2Percent}%)` : ''}`,
                            }))}
                            disabled={busy}
                            onLink={(sourceId) => act({ type: 'link-vital', platformId: row.platformId, vitalToolId: sourceId })}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={STAGE_ORDER.length + 2} className="px-3 py-12 text-center text-stone-500">No platforms yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LinkPanel({
  label,
  options,
  disabled,
  onLink,
}: {
  label: string
  options: { id: string; label: string }[]
  disabled: boolean
  onLink: (id: string) => void
}) {
  const [selectedId, setSelectedId] = React.useState('')
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] font-medium text-emerald-950">{label}:</span>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[12.5px]"
      >
        <option value="">Select…</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled || !selectedId}
        onClick={() => onLink(selectedId)}
      >
        Link
      </Button>
    </div>
  )
}

function ConfigEditor({ config, disabled }: { config: Config; disabled: boolean }) {
  const router = useRouter()
  const [draft, setDraft] = React.useState(config)
  const [saving, setSaving] = React.useState(false)

  const set = (k: keyof Config, v: string) => setDraft((d) => ({ ...d, [k]: Number(v) }))
  const weightSum = draft.aiWeight + draft.cefrWeight + draft.vitalWeight + draft.prdWeight

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/pipeline/config', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('Pipeline config saved')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const stages: { key: PipelineStage; t: keyof Config; w: keyof Config }[] = [
    { key: 'AI_SCREENING', t: 'aiThreshold', w: 'aiWeight' },
    { key: 'CEFR', t: 'cefrThreshold', w: 'cefrWeight' },
    { key: 'VITAL', t: 'vitalThreshold', w: 'vitalWeight' },
    { key: 'PRD', t: 'prdThreshold', w: 'prdWeight' },
  ]

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-[16px] tracking-tight text-emerald-950">Thresholds &amp; weights</h3>
        <Button size="sm" disabled={disabled || saving} onClick={save}>{saving ? 'Saving…' : 'Save config'}</Button>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stages.map((s) => (
          <div key={s.key} className="space-y-2">
            <p className="text-[12px] font-medium text-emerald-950">{STAGE_LABELS[s.key]}</p>
            <label className="block text-[11px] text-stone-500">
              Pass threshold %
              <input type="number" min={0} max={100} value={draft[s.t]} onChange={(e) => set(s.t, e.target.value)}
                className="mt-0.5 w-full rounded-md border border-stone-200 px-2 py-1 text-[12.5px] tabular-nums" />
            </label>
            <label className="block text-[11px] text-stone-500">
              Weight
              <input type="number" min={0} max={100} value={draft[s.w]} onChange={(e) => set(s.w, e.target.value)}
                className="mt-0.5 w-full rounded-md border border-stone-200 px-2 py-1 text-[12.5px] tabular-nums" />
            </label>
          </div>
        ))}
      </div>
      <p className={cn('mt-2 text-[11px]', weightSum === 100 ? 'text-stone-400' : 'text-amber-600')}>
        Weights sum to {weightSum}{weightSum !== 100 && ' (aggregate renormalises, but 100 is clearest)'}.
      </p>
    </div>
  )
}
