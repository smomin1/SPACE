'use client'

import * as React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Label } from '@/components/ui/label'

interface Platform {
  id: string
  platformName: string
  overallPct: number
  categoryPct: Record<string, number>
}

const PALETTE = ['#1A4731', '#f59e0b', '#0ea5e9']

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e7e5e4',
  borderRadius: 4,
  fontSize: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
}

export function CategoricalAnalysis({
  platforms,
  categories,
}: {
  platforms: Platform[]
  categories: string[]
}) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    platforms.length > 0 ? [platforms[0].id] : [],
  )

  function toggle(id: string) {
    setSelectedIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id)
      if (cur.length >= 3) return cur // max 3
      return [...cur, id]
    })
  }

  if (platforms.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/30 px-6 py-12 text-center">
        <p className="text-[13px] text-stone-500">
          No evaluations yet. Run a Tool Scanner evaluation first.
        </p>
      </div>
    )
  }

  const selected = platforms.filter((p) => selectedIds.includes(p.id))

  // Build chart data: one row per category, one bar per selected platform
  const chartData = categories.map((cat) => {
    const row: Record<string, string | number> = { category: cat }
    for (const p of selected) {
      row[p.platformName] = p.categoryPct[cat] ?? 0
    }
    return row
  })

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-stone-200/80 bg-white p-4 shadow-sm">
        <Label className="text-[12px] text-stone-600">
          Select up to 3 platforms to compare
        </Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {platforms.map((p) => {
            const isSelected = selectedIds.includes(p.id)
            const disabled = !isSelected && selectedIds.length >= 3
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                disabled={disabled}
                className={
                  'h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors ' +
                  (isSelected
                    ? 'bg-emerald-900 text-white'
                    : disabled
                      ? 'bg-stone-50 text-stone-300 cursor-not-allowed'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200')
                }
              >
                {p.platformName}
                <span className="ml-1.5 font-mono text-[10.5px] tabular-nums opacity-70">
                  {p.overallPct.toFixed(0)}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/30 px-6 py-12 text-center">
          <p className="text-[13px] text-stone-500">
            Select a platform to view its categorical breakdown.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
          {/* Stats table */}
          <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-sm">
            <div className="border-b border-stone-200/60 px-4 py-3">
              <h3 className="font-serif text-[16px] tracking-tight text-emerald-950">
                Coverage by category
              </h3>
              <p className="mt-0.5 text-[11.5px] text-stone-500">
                % coverage (Yes = full, Partial = half)
              </p>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-stone-50/60">
                  <th className="px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                    Category
                  </th>
                  {selected.map((p) => (
                    <th
                      key={p.id}
                      className="px-3 py-2 text-right text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55"
                    >
                      {p.platformName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {categories.map((cat) => (
                  <tr key={cat} className="hover:bg-stone-50/30">
                    <td className="px-3 py-2 text-emerald-950">{cat}</td>
                    {selected.map((p) => (
                      <td
                        key={p.id}
                        className="px-3 py-2 text-right font-mono tabular-nums text-emerald-950"
                      >
                        {(p.categoryPct[cat] ?? 0).toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bar chart */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-serif text-[16px] tracking-tight text-emerald-950">
              {selected.length === 1
                ? `${selected[0].platformName}: Category Profile`
                : 'Categorical Comparison'}
            </h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, bottom: 50, left: 0 }}
                barSize={selected.length === 1 ? 28 : 18}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10.5, fill: '#78716c' }}
                  axisLine={false}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={60}
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
                  cursor={{ fill: '#f5f5f4' }}
                  formatter={(v: unknown) => `${Number(v).toFixed(1)}%`}
                />
                {selected.length > 1 && <Legend wrapperStyle={{ fontSize: 11.5 }} />}
                {selected.map((p, i) => (
                  <Bar
                    key={p.id}
                    dataKey={p.platformName}
                    fill={PALETTE[i % PALETTE.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
