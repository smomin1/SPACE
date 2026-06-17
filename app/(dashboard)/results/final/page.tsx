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
import { alignmentByLevelAndGroup } from '@/lib/cefr'
import type { CefrAnswer } from '@prisma/client'

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

      {/* ── CEFR micro-level recommendations ──────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">
            Recommended Tools per CEFR Micro-Level
          </h2>
          <p className="mt-0.5 text-[12px] text-stone-500">
            Top two tools at each level by skill cluster: L&amp;S (Listening &amp; Speaking) and
            RWV&amp;G (Reading, Writing, Vocabulary &amp; Grammar), by CEFR alignment.
          </p>
        </div>

        {microLevels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/40 px-6 py-12 text-center">
            <p className="text-[13px] text-stone-500">No completed CEFR evaluations yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-stone-50/60">
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Level</th>
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">L&amp;S — top tools</th>
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">RWV&amp;G — top tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {microLevels.map((lvl) => (
                  <tr key={lvl.code} className="hover:bg-stone-50/40">
                    <td className="px-3 py-2.5 font-medium text-emerald-950">{lvl.code}</td>
                    <td className="px-3 py-2.5"><PickList picks={lvl.ls} /></td>
                    <td className="px-3 py-2.5"><PickList picks={lvl.rwvg} /></td>
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

// Build the "2 tools per CEFR micro-level" output from completed CEFR evaluations.
async function buildCefrMicroLevels() {
  const [levels, questions, evaluations] = await Promise.all([
    prisma.cefrLevel.findMany({ orderBy: { order: 'asc' }, select: { id: true, code: true } }),
    prisma.cefrQuestion.findMany({
      select: { id: true, levelId: true, skill: { select: { group: true } } },
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

  const q = questions.map((x) => ({ id: x.id, levelId: x.levelId, skillId: '', group: x.skill.group }))

  // levelId -> { ls: [{name,pct}], rwvg: [...] }
  type Pick = { name: string; pct: number }
  const lsByLevel = new Map<string, Pick[]>()
  const rwvgByLevel = new Map<string, Pick[]>()

  for (const ev of evaluations) {
    const byLevel = alignmentByLevelAndGroup(
      q,
      ev.responses as { questionId: string; answer: CefrAnswer }[],
    )
    for (const [levelId, g] of Object.entries(byLevel)) {
      if (!lsByLevel.has(levelId)) lsByLevel.set(levelId, [])
      if (!rwvgByLevel.has(levelId)) rwvgByLevel.set(levelId, [])
      lsByLevel.get(levelId)!.push({ name: ev.platform.name, pct: g.LS })
      rwvgByLevel.get(levelId)!.push({ name: ev.platform.name, pct: g.RWVG })
    }
  }

  const top2 = (arr: Pick[] = []) =>
    [...arr].filter((p) => p.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 2)

  return levels
    .map((l) => ({ code: l.code, ls: top2(lsByLevel.get(l.id)), rwvg: top2(rwvgByLevel.get(l.id)) }))
    .filter((l) => l.ls.length > 0 || l.rwvg.length > 0)
}
