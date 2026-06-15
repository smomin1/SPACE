'use client'

import * as React from 'react'
import Link from 'next/link'
import { getRecommendedAction } from '@/lib/scoring'
import {
  greedyToolSetCover,
  buildCombinedAnalysis,
  buildTopPickProfile,
  WEAK_CATEGORY_THRESHOLD,
  type BestFitTool,
  type BestFitQuestion,
  type CombinedAnalysis,
  type TopPickProfile,
  type GapItem,
} from '@/lib/tool-scanner-best-fit'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Props {
  tools: BestFitTool[]
  questions: BestFitQuestion[]
  categories: string[]
  allGrades: string[]
  allFluency: string[]
}

const MAX_POINTS = 2 // a YES answer; used to render points as a %

export function BestFitView({ tools, questions, categories, allGrades, allFluency }: Props) {
  const [gradeFilter, setGradeFilter] = React.useState('all')
  const [fluencyFilter, setFluencyFilter] = React.useState('all')
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])

  const toggleCategory = (c: string) =>
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )

  // Tools that match the grade/fluency filters
  const filteredTools = React.useMemo(
    () =>
      tools.filter((t) => {
        if (gradeFilter !== 'all' && !t.grades.includes(gradeFilter)) return false
        if (fluencyFilter !== 'all' && !t.fluency.includes(fluencyFilter)) return false
        return true
      }),
    [tools, gradeFilter, fluencyFilter],
  )

  // Questions scoped to the selected categories (none selected = all)
  const activeQuestions = React.useMemo(
    () =>
      selectedCategories.length === 0
        ? questions
        : questions.filter((q) => selectedCategories.includes(q.category)),
    [questions, selectedCategories],
  )

  const { analysis, topPick } = React.useMemo(() => {
    if (filteredTools.length === 0 || activeQuestions.length === 0) {
      return { analysis: null as CombinedAnalysis | null, topPick: null as TopPickProfile | null }
    }
    const { selectedIds, bestPerQuestion, marginalGains } = greedyToolSetCover(
      filteredTools,
      activeQuestions,
    )
    const analysis = buildCombinedAnalysis(
      selectedIds,
      bestPerQuestion,
      marginalGains,
      filteredTools,
      activeQuestions,
    )
    const topPick = selectedIds[0]
      ? buildTopPickProfile(selectedIds[0], filteredTools, activeQuestions)
      : null
    return { analysis, topPick }
  }, [filteredTools, activeQuestions])

  return (
    <div className="space-y-6">
      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3 rounded-lg border border-stone-200/80 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[12px] text-stone-600">Filter by Grade</Label>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All grades</SelectItem>
                {allGrades.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] text-stone-600">Filter by Fluency</Label>
            <Select value={fluencyFilter} onValueChange={setFluencyFilter}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All fluency levels</SelectItem>
                {allFluency.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[12px] text-stone-600">
              Scope to Categories {selectedCategories.length > 0 && `(${selectedCategories.length})`}
            </Label>
            {selectedCategories.length > 0 && (
              <button
                onClick={() => setSelectedCategories([])}
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const on = selectedCategories.includes(c)
              return (
                <button
                  key={c}
                  onClick={() => toggleCategory(c)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                    on
                      ? 'border-emerald-700/40 bg-emerald-100/80 text-emerald-900'
                      : 'border-stone-200 bg-white text-stone-500 hover:border-emerald-700/30 hover:text-emerald-800',
                  )}
                >
                  {c}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-stone-400">
            No selection scores tools across all categories.
          </p>
        </div>
      </div>

      {!analysis || analysis.members.length === 0 ? (
        <EmptyState
          message={
            tools.length === 0
              ? 'No completed scans yet'
              : 'No tools match the selected filters'
          }
          hint={
            tools.length === 0
              ? 'Run scans in the Evaluator tab, then return here.'
              : 'Loosen the grade, fluency, or category filters.'
          }
        />
      ) : (
        <>
          <CombinedSetSection analysis={analysis} />
          <GapAnalysisSection analysis={analysis} />
          <CategorySatisfactionSection analysis={analysis} />
          {topPick && analysis.members.length > 0 && <TopPickSection profile={topPick} />}
        </>
      )}
    </div>
  )
}

// ─── Recommended Combination ─────────────────────────────────────────────────

function CombinedSetSection({ analysis: a }: { analysis: CombinedAnalysis }) {
  const satisfactionPct = a.totalCount > 0 ? Math.round((a.satisfiedCount / a.totalCount) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">
            Recommended Combination
          </h2>
          <p className="mt-0.5 text-[12px] text-stone-500">
            The highest-scoring tool is the primary pick; each addition is the tool that most
            raises the combined coverage. A question is satisfied when a tool answers Yes.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-6 text-right">
          <div>
            <p className="text-2xl font-bold tabular-nums text-emerald-800">
              {a.combinedPct.toFixed(1)}%
            </p>
            <p className="mt-0.5 text-[11px] text-stone-400">combined coverage</p>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums text-stone-700">
              {a.satisfiedCount}
              <span className="text-sm font-normal text-stone-400"> / {a.totalCount}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-stone-400">questions satisfied</p>
          </div>
          <div>
            <p
              className={cn(
                'text-xl font-bold tabular-nums',
                satisfactionPct >= 80
                  ? 'text-emerald-700'
                  : satisfactionPct >= 60
                    ? 'text-amber-600'
                    : 'text-red-600',
              )}
            >
              {satisfactionPct}%
            </p>
            <p className="mt-0.5 text-[11px] text-stone-400">satisfaction rate</p>
          </div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${Math.min(100, a.combinedPct)}%` }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {a.members.map((m, i) => {
          const tier = getRecommendedAction(m.overallPct)
          return (
            <div
              key={m.id}
              className={cn(
                'space-y-3 rounded-xl border p-5',
                i === 0 ? 'border-emerald-200/70 bg-emerald-50/40' : 'border-stone-200/80 bg-white',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white',
                        i === 0 ? 'bg-emerald-600' : 'bg-stone-500',
                      )}
                    >
                      {i === 0 ? 'Primary' : `+${m.marginalGainPct.toFixed(1)}% coverage`}
                    </span>
                    <span className="text-[11px] tabular-nums text-stone-400">#{i + 1}</span>
                  </div>
                  <Link
                    href={`/tool-scanner/${m.id}`}
                    className="truncate font-bold text-emerald-950 hover:text-emerald-800 hover:underline"
                  >
                    {m.name}
                  </Link>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn('text-xl font-bold tabular-nums', scoreColor(m.overallPct))}>
                    {m.overallPct.toFixed(1)}%
                  </p>
                  <span
                    className={cn(
                      'mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white',
                      tierColor(tier),
                    )}
                  >
                    {tier.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={cn('h-full rounded-full', i === 0 ? 'bg-emerald-600' : 'bg-stone-400')}
                  style={{ width: `${Math.min(100, m.overallPct)}%` }}
                />
              </div>

              {m.topCategories.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    Best contributor in
                  </p>
                  <ul className="space-y-1">
                    {m.topCategories.map((c) => (
                      <li key={c.category} className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] text-stone-600">{c.category}</span>
                        <span className="shrink-0 text-[11px] font-medium tabular-nums text-emerald-700">
                          {c.pct.toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Coverage Gaps ─────────────────────────────────────────────────────────────

function GapAnalysisSection({ analysis: a }: { analysis: CombinedAnalysis }) {
  if (a.gaps.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-5 text-center">
        <p className="text-[13px] font-medium text-emerald-800">Full coverage achieved</p>
        <p className="mt-1 text-[12px] text-stone-400">
          The recommended combination satisfies every question in scope.
        </p>
      </div>
    )
  }

  const uncovered = a.gaps.filter((g) => g.type === 'uncovered')
  const weak = a.gaps.filter((g) => g.type === 'weak')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">Coverage Gaps</h2>
          <p className="mt-0.5 text-[12px] text-stone-500">
            Questions the combination still does not fully satisfy
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-right">
          {uncovered.length > 0 && (
            <div>
              <p className="text-lg font-bold tabular-nums text-red-600">{uncovered.length}</p>
              <p className="text-[10px] text-stone-400">unanswered</p>
            </div>
          )}
          {weak.length > 0 && (
            <div>
              <p className="text-lg font-bold tabular-nums text-amber-600">{weak.length}</p>
              <p className="text-[10px] text-stone-400">partial only</p>
            </div>
          )}
        </div>
      </div>

      {a.gapByCategory.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
          <div className="border-b border-stone-100 bg-stone-50/60 px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Gaps by Category
            </p>
          </div>
          <div className="divide-y divide-stone-100">
            {a.gapByCategory.map((cat) => {
              const gapCount = cat.uncovered + cat.weak
              const gapPct = cat.total > 0 ? (gapCount / cat.total) * 100 : 0
              return (
                <div key={cat.category} className="flex items-center gap-4 px-5 py-3">
                  <p className="flex-1 truncate text-[13px] text-stone-700">{cat.category}</p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={cn('h-full rounded-full', gapPct > 50 ? 'bg-red-500' : 'bg-amber-500')}
                        style={{ width: `${Math.min(100, gapPct)}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        'w-16 text-right text-[11.5px] font-medium tabular-nums',
                        gapPct > 50 ? 'text-red-600' : 'text-amber-600',
                      )}
                    >
                      {gapCount}/{cat.total}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {uncovered.length > 0 && (
        <GapGroup
          title="Unanswered Questions"
          subtitle="No tool in the set answers these; screening could not determine them."
          items={uncovered}
          color="red"
        />
      )}
      {weak.length > 0 && (
        <GapGroup
          title="Partially Covered Questions"
          subtitle="The best the set offers is a Partial. Another tool may answer these fully."
          items={weak}
          color="amber"
        />
      )}
    </div>
  )
}

function GapGroup({
  title,
  subtitle,
  items,
  color,
}: {
  title: string
  subtitle: string
  items: GapItem[]
  color: 'red' | 'amber'
}) {
  const borderCls = color === 'red' ? 'border-red-200/70' : 'border-amber-200/70'
  const headerBg = color === 'red' ? 'border-red-100 bg-red-50/60' : 'border-amber-100 bg-amber-50/60'
  const dotCls = color === 'red' ? 'bg-red-500' : 'bg-amber-500'

  return (
    <div className={cn('overflow-hidden rounded-xl border', borderCls)}>
      <div className={cn('border-b px-5 py-3', headerBg)}>
        <p className="text-[12.5px] font-semibold text-stone-700">{title}</p>
        <p className="mt-0.5 text-[11px] text-stone-400">{subtitle}</p>
      </div>
      <div className="divide-y divide-stone-100 bg-white">
        {items.map((item) => (
          <div key={item.id} className="space-y-1.5 px-5 py-3.5">
            <div className="flex items-start gap-3">
              <div className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', dotCls)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-stone-400">{item.category}</span>
                  {item.bestPoints !== null && (
                    <span className="text-[11.5px] tabular-nums font-medium text-amber-600">
                      best in set: {((item.bestPoints / MAX_POINTS) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            {item.helperTools.length > 0 && (
              <div className="ml-4 mt-1 flex flex-wrap gap-2">
                <span className="self-center text-[11px] text-stone-400">Could be helped by:</span>
                {item.helperTools.map((hp) => (
                  <span
                    key={hp.name}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/70 bg-emerald-50/50 px-2.5 py-0.5 text-[11.5px] font-medium text-emerald-800"
                  >
                    {hp.name}
                    <span className="tabular-nums text-emerald-600">
                      {((hp.points / MAX_POINTS) * 100).toFixed(0)}%
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Satisfaction by Category ────────────────────────────────────────────────

function CategorySatisfactionSection({ analysis: a }: { analysis: CombinedAnalysis }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">
            Satisfaction by Category
          </h2>
          <p className="mt-0.5 text-[12px] text-stone-500">
            How fully the recommended combination meets each category
          </p>
        </div>
        <div className="flex-1 border-t border-stone-200/80" />
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
        <div className="divide-y divide-stone-100">
          {a.categorySatisfaction.map((cat) => {
            const catSatPct = cat.total > 0 ? (cat.satisfied / cat.total) * 100 : 0
            return (
              <div key={cat.category} className="flex items-center gap-4 px-5 py-3">
                <p className="w-44 shrink-0 truncate text-[13px] text-stone-700">{cat.category}</p>
                <div className="flex h-2 flex-1 gap-px overflow-hidden rounded-full">
                  {cat.satisfied > 0 && (
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${(cat.satisfied / cat.total) * 100}%` }}
                    />
                  )}
                  {cat.partial > 0 && (
                    <div
                      className="bg-amber-400"
                      style={{ width: `${(cat.partial / cat.total) * 100}%` }}
                    />
                  )}
                  {cat.uncovered > 0 && <div className="flex-1 bg-red-400" />}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-right">
                  <span
                    className={cn(
                      'w-10 text-right text-[12px] font-bold tabular-nums',
                      catSatPct >= 75
                        ? 'text-emerald-700'
                        : catSatPct >= 50
                          ? 'text-amber-600'
                          : 'text-red-600',
                    )}
                  >
                    {catSatPct.toFixed(0)}%
                  </span>
                  <span className="w-24 text-right text-[11px] tabular-nums text-stone-400">
                    {cat.satisfied}/{cat.total} satisfied
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Top Pick profile ────────────────────────────────────────────────────────

function TopPickSection({ profile: p }: { profile: TopPickProfile }) {
  const tier = getRecommendedAction(p.overallPct)

  return (
    <div className="space-y-5 border-t border-stone-200/70 pt-6">
      <div>
        <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">
          Top Pick: {p.name}
        </h2>
        <p className="mt-0.5 text-[12px] text-stone-500">
          The single best-fit tool on its own, with alternatives for its weaker categories
        </p>
      </div>

      <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/tool-scanner/${p.id}`}
              className="text-2xl font-bold text-emerald-950 hover:text-emerald-800 hover:underline"
            >
              {p.name}
            </Link>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-4xl font-bold tabular-nums text-emerald-800">
              {p.overallPct.toFixed(1)}%
            </p>
            <span
              className={cn(
                'mt-1.5 inline-flex items-center rounded-full px-3 py-0.5 text-[12px] font-semibold text-white',
                tierColor(tier),
              )}
            >
              {tier.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-emerald-100">
          <div
            className="h-full rounded-full bg-emerald-600"
            style={{ width: `${Math.min(100, p.overallPct)}%` }}
          />
        </div>
      </div>

      {p.categoryBreakdown.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-[14px] font-semibold text-emerald-950">Category Breakdown</h3>
            <p className="mt-0.5 text-[12px] text-stone-400">
              Categories below {WEAK_CATEGORY_THRESHOLD}% are flagged as gaps
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.categoryBreakdown.map((c) => {
              const isGap = c.pct < WEAK_CATEGORY_THRESHOLD
              const isCritical = c.pct < 50
              return (
                <div
                  key={c.category}
                  className={cn(
                    'space-y-2 rounded-lg border p-3.5',
                    isCritical
                      ? 'border-red-200/80 bg-red-50/30'
                      : isGap
                        ? 'border-amber-200/80 bg-amber-50/30'
                        : 'border-stone-200/60 bg-white',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12.5px] font-medium text-stone-700">{c.category}</p>
                    <span className={cn('shrink-0 text-[13px] font-bold tabular-nums', scoreColor(c.pct))}>
                      {c.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        isCritical ? 'bg-red-500' : isGap ? 'bg-amber-500' : 'bg-emerald-500',
                      )}
                      style={{ width: `${Math.min(100, c.pct)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {p.gapSuggestions.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-[14px] font-semibold text-emerald-950">Gap Filler Suggestions</h3>
          {p.gapSuggestions.map((gap) => (
            <div key={gap.category} className="space-y-3 rounded-xl border border-stone-200/80 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className={cn('h-2 w-2 shrink-0 rounded-full', gap.toolPct < 50 ? 'bg-red-500' : 'bg-amber-500')} />
                <p className="text-[13px] font-semibold text-stone-800">{gap.category}</p>
                <span className={cn('text-[11.5px] font-medium tabular-nums', gap.toolPct < 50 ? 'text-red-600' : 'text-amber-600')}>
                  {p.name}: {gap.toolPct.toFixed(0)}%
                </span>
              </div>
              {gap.alternatives.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {gap.alternatives.map((alt) => (
                    <Link
                      key={alt.id}
                      href={`/tool-scanner/${alt.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3.5 py-2.5 hover:bg-emerald-50"
                    >
                      <p className="min-w-0 truncate text-[12.5px] font-semibold text-stone-800">{alt.name}</p>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-emerald-700">{alt.pct.toFixed(0)}%</p>
                        <p className="text-[10px] text-stone-400">in this category</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] italic text-stone-400">No other scanned tool scores better here</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-5 text-center">
          <p className="text-[13px] font-medium text-emerald-800">No significant gaps</p>
          <p className="mt-1 text-[12px] text-stone-400">
            This tool scores above {WEAK_CATEGORY_THRESHOLD}% in every category in scope.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Shared ──────────────────────────────────────────────────────────────────

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50/30 py-20 text-center">
      <p className="text-[13px] font-medium text-stone-500">{message}</p>
      <p className="mt-1 text-[12px] text-stone-400">{hint}</p>
    </div>
  )
}

function scoreColor(pct: number): string {
  if (pct >= 70) return 'text-emerald-700'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function tierColor(tier: ReturnType<typeof getRecommendedAction>): string {
  switch (tier) {
    case 'TOP_PICK':
      return 'bg-emerald-600'
    case 'RECOMMENDED':
      return 'bg-emerald-500'
    case 'CONSIDER':
      return 'bg-amber-500'
    case 'NOT_RECOMMENDED':
      return 'bg-stone-500'
  }
}
