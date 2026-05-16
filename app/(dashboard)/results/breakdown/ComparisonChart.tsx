'use client'

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { cn } from '@/lib/utils'
import { FullscreenWrapper } from '@/components/ui/fullscreen-wrapper'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PlatformSeries = {
  id: string
  name: string
  vendor: string
  scores: Record<string, number | null>
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const COLORS = ['#059669', '#2563eb', '#d97706'] as const

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e7e5e4',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}

// ─── Main component ─────────────────────────────────────────────────────────────

export function ComparisonChart({
  platforms,
  categories,
  chartType,
}: {
  platforms: PlatformSeries[]
  categories: string[]
  chartType: 'bar' | 'radar'
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => platforms.slice(0, 3).map(p => p.id),
  )

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) setSelectedIds(prev => prev.filter(s => s !== id))
    } else {
      if (selectedIds.length < 3) setSelectedIds(prev => [...prev, id])
    }
  }

  const active = platforms
    .filter(p => selectedIds.includes(p.id))
    .sort((a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id))

  const colorOf = (i: number) => COLORS[i] ?? COLORS[0]

  // Recharts data: [{ category, p0: score, p1: score, p2: score }, ...]
  const chartData = useMemo(
    () =>
      categories.map(cat => {
        const row: Record<string, string | number> = { category: cat }
        active.forEach((p, i) => {
          row[`p${i}`] = p.scores[cat] ?? 0
        })
        return row
      }),
    [categories, active],
  )

  const tooltipFormatter = (v: unknown, key: unknown) => {
    const idx = parseInt(String(key).replace('p', ''), 10)
    return [`${Number(v).toFixed(1)}%`, active[idx]?.name ?? String(key)] as [string, string]
  }

  const canRadar = categories.length >= 3

  return (
    <FullscreenWrapper title="Category Breakdown">
    <div className="space-y-5">
      {/* ── Platform selector ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          Compare
        </span>
        {platforms.map(p => {
          const activeIdx  = active.findIndex(ap => ap.id === p.id)
          const isSelected = activeIdx >= 0
          const maxReached = !isSelected && selectedIds.length >= 3
          const color      = isSelected ? colorOf(activeIdx) : undefined

          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              disabled={maxReached}
              style={isSelected && color ? { backgroundColor: color, borderColor: color } : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-all',
                isSelected && 'text-white shadow-sm',
                !isSelected && !maxReached && 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-800',
                maxReached && 'cursor-not-allowed border-stone-100 bg-white text-stone-300',
              )}
            >
              {isSelected && (
                <span className="size-1.5 rounded-full bg-white/70 shrink-0" />
              )}
              {p.name}
            </button>
          )
        })}
        {platforms.length > 3 && (
          <span className="text-[11px] text-stone-400">{selectedIds.length}/3</span>
        )}
      </div>

      {/* ── Chart card ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-5">
        {active.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-stone-300 text-sm">
            Select at least one platform above
          </div>
        ) : chartType === 'radar' && canRadar ? (
          <RadarView data={chartData} active={active} colorOf={colorOf} tooltipFormatter={tooltipFormatter} />
        ) : (
          <BarView
            data={chartData}
            categories={categories}
            active={active}
            colorOf={colorOf}
            tooltipFormatter={tooltipFormatter}
          />
        )}

        {/* ── Legend ───────────────────────────────────────────────────────── */}
        {active.length > 0 && (
          <div className="flex flex-wrap justify-center gap-5 mt-5 pt-4 border-t border-stone-100">
            {active.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <span
                  className="size-3 rounded-sm shrink-0"
                  style={{ backgroundColor: colorOf(i) }}
                />
                <span className="text-[12.5px] font-semibold text-stone-700">{p.name}</span>
                <span className="text-[11.5px] text-stone-400">{p.vendor}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </FullscreenWrapper>
  )
}

// ─── Bar chart view ─────────────────────────────────────────────────────────────

function BarView({
  data,
  categories,
  active,
  colorOf,
  tooltipFormatter,
}: {
  data: Record<string, string | number>[]
  categories: string[]
  active: PlatformSeries[]
  colorOf: (i: number) => string
  tooltipFormatter: (v: unknown, key: unknown) => [string, string]
}) {
  const barWidth      = 22
  const groupWidth    = active.length * (barWidth + 4) + 20
  const minChartWidth = Math.max(categories.length * groupWidth, 480)

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: minChartWidth, height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 64, left: 8 }}
            barCategoryGap="28%"
            barGap={3}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 10.5, fill: '#78716c' }}
              axisLine={false}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={64}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#a8a29e' }}
              tickFormatter={(v: unknown) => `${v}%`}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: '#f5f5f450' }}
              formatter={tooltipFormatter}
            />
            {active.map((_, i) => (
              <Bar
                key={i}
                dataKey={`p${i}`}
                fill={colorOf(i)}
                radius={[3, 3, 0, 0]}
                maxBarSize={barWidth}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Radar chart view ───────────────────────────────────────────────────────────

function RadarView({
  data,
  active,
  colorOf,
  tooltipFormatter,
}: {
  data: Record<string, string | number>[]
  active: PlatformSeries[]
  colorOf: (i: number) => string
  tooltipFormatter: (v: unknown, key: unknown) => [string, string]
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={data} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
        <PolarGrid stroke="#e7e5e4" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fontSize: 11, fill: '#78716c' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tickCount={5}
          tick={{ fontSize: 9, fill: '#a8a29e' }}
          tickFormatter={(v: unknown) => `${v}%`}
        />
        {active.map((_, i) => (
          <Radar
            key={i}
            dataKey={`p${i}`}
            stroke={colorOf(i)}
            fill={colorOf(i)}
            fillOpacity={0.12}
            strokeWidth={2}
            dot={{ r: 3.5, fill: colorOf(i), strokeWidth: 0 }}
          />
        ))}
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={tooltipFormatter}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
