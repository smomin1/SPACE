import { prisma } from '@/lib/prisma'
import { getRecommendedAction } from '@/lib/scoring'
import {
  STAGE_ORDER,
  STAGE_LABELS,
  aggregateFromScores,
  isPipelineComplete,
  type StageScoreMap,
} from '@/lib/pipeline'
import { evaluatePlatformPipeline, getOrCreateConfig } from '@/lib/pipeline-server'
import { alignmentPercent } from '@/lib/cefr'
import type { CefrAnswer } from '@prisma/client'
import { PipelineBarChart, AggregateBarChart, type PipelineRow } from './PipelineChart'

// Map individual skill names → one of 4 display buckets
const SKILL_BUCKET: Record<string, 'SL' | 'RV' | 'G' | 'W'> = {
  Speaking:    'SL',
  Listening:   'SL',
  Reading:     'RV',
  Vocabulary:  'RV',
  Grammar:     'G',
  Writing:     'W',
}

const BUCKET_LABELS = {
  SL: 'Speaking & Listening',
  RV: 'Reading & Vocab',
  G:  'Grammar',
  W:  'Writing',
} as const

type Bucket = keyof typeof BUCKET_LABELS

const TIER_STYLE: Record<string, string> = {
  TOP_PICK: 'bg-emerald-600',
  RECOMMENDED: 'bg-emerald-500',
  CONSIDER: 'bg-amber-500',
  NOT_RECOMMENDED: 'bg-stone-500',
}
function scoreColor(pct: number): string {
  if (pct >= 70) return 'text-emerald-700'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

type StageCell = { stage: string; label: string; score: number | null; status: string }
type ReportRow = {
  platformId: string
  name: string
  vendor: string
  aggregate: number
  complete: boolean
  stages: StageCell[]
}

export default async function FinalReportPage() {
  const config = await getOrCreateConfig()

  const platforms = await prisma.platform.findMany({
    where: { status: { not: 'DISQUALIFIED' } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, vendor: true },
  })

  const rows: ReportRow[] = await Promise.all(
    platforms.map(async (p) => {
      const { results, derived } = await evaluatePlatformPipeline(p.id, config)
      const scoreMap = Object.fromEntries(
        STAGE_ORDER.map((s) => [s, derived[s].score]),
      ) as StageScoreMap
      return {
        platformId: p.id,
        name: p.name,
        vendor: p.vendor,
        aggregate: aggregateFromScores(scoreMap, config),
        complete: isPipelineComplete(results),
        stages: results.map((r) => ({
          stage: r.stage,
          label: STAGE_LABELS[r.stage],
          score: r.score,
          status: r.status,
        })),
      }
    }),
  )

  const completed = rows.filter((r) => r.complete).sort((a, b) => b.aggregate - a.aggregate)
  const inProgress = rows.filter((r) => !r.complete)

  // Chart data — only platforms that cleared all pipeline stages
  const chartRows: PipelineRow[] = rows
    .filter((r) => r.complete)
    .sort((a, b) => b.aggregate - a.aggregate)
    .map((r) => ({
      name: r.name,
      'AI Screening': r.stages.find((s) => s.stage === 'AI_SCREENING')?.score ?? null,
      'CEFR':         r.stages.find((s) => s.stage === 'CEFR')?.score ?? null,
      'VITAL':        r.stages.find((s) => s.stage === 'VITAL')?.score ?? null,
      'Tool Eval':    r.stages.find((s) => s.stage === 'PRD')?.score ?? null,
      aggregate:      r.aggregate,
    }))

  const microLevels = await buildCefrMicroLevels()

  return (
    <div className="space-y-10">
      {/* ── Final ranking ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">Final Ranking</h2>
          <p className="mt-0.5 text-[12px] text-stone-500">
            Platforms that cleared every pipeline stage, ranked by the weighted aggregate
            (AI {config.aiWeight}% · CEFR {config.cefrWeight}% · VITAL {config.vitalWeight}% · PRD {config.prdWeight}%).
          </p>
        </div>

        {completed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/40 px-6 py-12 text-center">
            <p className="text-[13px] text-stone-500">No platforms have cleared all stages yet.</p>
            <p className="mt-1 text-[12px] text-stone-400">
              {inProgress.length} platform{inProgress.length === 1 ? '' : 's'} still in the pipeline.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-stone-50/60">
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">#</th>
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Platform</th>
                  {STAGE_ORDER.map((s) => (
                    <th key={s} className="px-3 py-2.5 text-center text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">{STAGE_LABELS[s]}</th>
                  ))}
                  <th className="px-3 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Aggregate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {completed.map((row, i) => {
                  const tier = getRecommendedAction(row.aggregate)
                  return (
                    <tr key={row.platformId} className="hover:bg-stone-50/40">
                      <td className="px-3 py-2.5 font-mono tabular-nums text-stone-400">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-emerald-950">{row.name}</div>
                        <div className="text-[11px] text-stone-400">{row.vendor}</div>
                      </td>
                      {row.stages.map((st) => (
                        <td key={st.stage} className="px-3 py-2.5 text-center font-mono text-[12px] tabular-nums text-stone-600">
                          {st.score != null ? `${st.score.toFixed(0)}%` : st.status === 'SKIPPED' ? '—' : '·'}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right">
                        <div className={`font-serif text-[18px] tabular-nums ${scoreColor(row.aggregate)}`}>
                          {row.aggregate.toFixed(1)}%
                        </div>
                        <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${TIER_STYLE[tier]}`}>
                          {tier.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {inProgress.length > 0 && completed.length > 0 && (
          <p className="text-[11.5px] text-stone-400">
            {inProgress.length} more platform{inProgress.length === 1 ? '' : 's'} still progressing through the pipeline.
          </p>
        )}
      </section>

      {/* ── Pipeline score breakdown ──────────────────────────────────────── */}
      {chartRows.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">Score by Evaluation Stage</h2>
            <p className="mt-0.5 text-[12px] text-stone-500">
              How each platform performed across all four stages of the pipeline.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stage breakdown grouped bar */}
            <div className="rounded-xl border border-stone-200/80 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-4">Stage Scores</p>
              <PipelineBarChart rows={chartRows} />
            </div>
            {/* Aggregate ranked bar */}
            <div className="rounded-xl border border-stone-200/80 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-4">Aggregate Score Ranking</p>
              <AggregateBarChart rows={chartRows} />
            </div>
          </div>
        </section>
      )}

      {/* ── CEFR micro-level recommendations ──────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">
            Recommended Tools per CEFR Micro-Level
          </h2>
          <p className="mt-0.5 text-[12px] text-stone-500">
            Top two tools at each level by skill cluster, ranked by CEFR alignment score.
          </p>
        </div>

        {microLevels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/40 px-6 py-12 text-center">
            <p className="text-[13px] text-stone-500">No completed CEFR evaluations yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-hidden rounded-xl border border-stone-200/80 bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-stone-50/60">
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Level</th>
                  {(['SL', 'RV', 'G', 'W'] as Bucket[]).map((b) => (
                    <th key={b} className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                      {BUCKET_LABELS[b]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {microLevels.map((lvl) => (
                  <tr key={lvl.code} className="hover:bg-stone-50/40">
                    <td className="px-3 py-2.5 font-medium text-emerald-950">{lvl.code}</td>
                    <td className="px-3 py-2.5"><PickList picks={lvl.SL} /></td>
                    <td className="px-3 py-2.5"><PickList picks={lvl.RV} /></td>
                    <td className="px-3 py-2.5"><PickList picks={lvl.G} /></td>
                    <td className="px-3 py-2.5"><PickList picks={lvl.W} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function PickList({ picks }: { picks: { name: string; pct: number }[] }) {
  if (picks.length === 0) return <span className="text-[12px] text-stone-300">—</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {picks.map((p, i) => (
        <span
          key={p.name + i}
          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/70 bg-emerald-50/50 px-2 py-0.5 text-[11.5px] font-medium text-emerald-800"
        >
          {p.name}
          <span className="tabular-nums text-emerald-600">{p.pct.toFixed(0)}%</span>
        </span>
      ))}
    </div>
  )
}

// Build the "2 tools per CEFR micro-level × 4 skill buckets" output.
async function buildCefrMicroLevels() {
  const [levels, questions, evaluations] = await Promise.all([
    prisma.cefrLevel.findMany({ orderBy: { order: 'asc' }, select: { id: true, code: true } }),
    prisma.cefrQuestion.findMany({
      select: { id: true, levelId: true, skill: { select: { name: true } } },
    }),
    prisma.cefrEvaluation.findMany({
      where: { status: 'COMPLETED' },
      select: {
        platform: { select: { name: true } },
        responses: { select: { questionId: true, answer: true } },
      },
    }),
  ])

  if (evaluations.length === 0) return []

  // Pre-build a lookup: questionId → { levelId, bucket }
  const qMeta = new Map(
    questions.map((q) => [q.id, { levelId: q.levelId, bucket: SKILL_BUCKET[q.skill.name] as Bucket | undefined }]),
  )

  type Pick = { name: string; pct: number }
  // levelId → bucket → list of answers (per evaluation scored separately)
  // We accumulate per-platform scores then pick top-2

  // levelId → bucket → [{ platformName, answers[] }]
  const acc = new Map<string, Map<Bucket, { name: string; answers: CefrAnswer[] }[]>>()

  for (const ev of evaluations) {
    // bucket within level → answers for this platform
    const perLevelBucket = new Map<string, Map<Bucket, CefrAnswer[]>>()

    for (const r of ev.responses as { questionId: string; answer: CefrAnswer }[]) {
      const meta = qMeta.get(r.questionId)
      if (!meta?.bucket) continue
      if (!perLevelBucket.has(meta.levelId)) perLevelBucket.set(meta.levelId, new Map())
      const bm = perLevelBucket.get(meta.levelId)!
      if (!bm.has(meta.bucket)) bm.set(meta.bucket, [])
      bm.get(meta.bucket)!.push(r.answer)
    }

    for (const [levelId, bm] of perLevelBucket.entries()) {
      if (!acc.has(levelId)) acc.set(levelId, new Map())
      const levelAcc = acc.get(levelId)!
      for (const bucket of ['SL', 'RV', 'G', 'W'] as Bucket[]) {
        const answers = bm.get(bucket) ?? []
        if (!levelAcc.has(bucket)) levelAcc.set(bucket, [])
        levelAcc.get(bucket)!.push({ name: ev.platform.name, answers })
      }
    }
  }

  const top2 = (entries: { name: string; answers: CefrAnswer[] }[] = []): Pick[] =>
    entries
      .map((e) => ({ name: e.name, pct: alignmentPercent(e.answers.map((a) => ({ answer: a }))) }))
      .filter((p) => p.pct > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 2)

  return levels
    .map((l) => {
      const bMap = acc.get(l.id)
      return {
        code: l.code,
        SL: top2(bMap?.get('SL')),
        RV: top2(bMap?.get('RV')),
        G:  top2(bMap?.get('G')),
        W:  top2(bMap?.get('W')),
      }
    })
    .filter((l) => l.SL.length > 0 || l.RV.length > 0 || l.G.length > 0 || l.W.length > 0)
}
