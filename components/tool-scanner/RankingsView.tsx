'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface RankingsRow {
  id: string
  platformName: string
  url: string
  overallPct: number
  categoryPct: Record<string, number>
  audience: string
  fluency: string[]
  grades: string[]
}

interface Props {
  data: RankingsRow[]
  categories: string[]
  allGrades: string[]
  allFluency: string[]
}

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e7e5e4',
  borderRadius: 4,
  fontSize: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
}

function barFill(pct: number): string {
  if (pct >= 85) return '#059669'
  if (pct >= 70) return '#10b981'
  if (pct >= 50) return '#f59e0b'
  return '#ef4444'
}

// Single-line, truncated Y-axis label so long platform names don't wrap and
// overlap their neighbours. The full name stays available via the native <title>.
const TICK_MAX = 22
function PlatformTick(props: { x?: number; y?: number; payload?: { value?: string } }) {
  const { x = 0, y = 0, payload } = props
  const full = String(payload?.value ?? '')
  const label = full.length > TICK_MAX ? `${full.slice(0, TICK_MAX - 1)}…` : full
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#78716c">
      <title>{full}</title>
      {label}
    </text>
  )
}

export function RankingsView({ data, categories, allGrades, allFluency }: Props) {
  const [gradeFilter, setGradeFilter] = React.useState<string>('all')
  const [fluencyFilter, setFluencyFilter] = React.useState<string>('all')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('overall')

  const filtered = data.filter((row) => {
    if (gradeFilter !== 'all' && !row.grades.includes(gradeFilter)) return false
    if (fluencyFilter !== 'all' && !row.fluency.includes(fluencyFilter)) return false
    return true
  })

  const ranked = filtered
    .map((row) => ({
      ...row,
      displayScore:
        categoryFilter === 'overall' ? row.overallPct : row.categoryPct[categoryFilter] ?? 0,
    }))
    .sort((a, b) => b.displayScore - a.displayScore)

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="grid gap-3 rounded-lg border border-stone-200/80 bg-white p-4 shadow-sm md:grid-cols-3">
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
        <div className="space-y-1.5">
          <Label className="text-[12px] text-stone-600">Rank by Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="overall">Overall score</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/30 px-6 py-12 text-center">
          <p className="text-[13px] text-stone-500">
            No platforms match the selected filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          {/* Rankings table */}
          <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-sm">
            <div className="border-b border-stone-200/60 px-4 py-3">
              <h3 className="font-serif text-[16px] tracking-tight text-emerald-950">
                {categoryFilter === 'overall' ? 'Overall Rankings' : `Ranked by: ${categoryFilter}`}
              </h3>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-stone-50/60">
                  <th className="px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">#</th>
                  <th className="px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Platform</th>
                  <th className="px-3 py-2 text-right text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Score</th>
                  <th className="px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Audience</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {ranked.map((row, i) => (
                  <tr key={row.id} className="hover:bg-stone-50/40">
                    <td className="px-3 py-2 font-mono tabular-nums text-stone-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/tool-scanner/${row.id}`}
                        className="font-medium text-emerald-950 hover:text-emerald-800 hover:underline"
                      >
                        {row.platformName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-950">
                      {row.displayScore.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-stone-600">{row.audience || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bar chart */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-serif text-[16px] tracking-tight text-emerald-950">
              Score Comparison
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(220, ranked.length * 36)}>
              <BarChart
                data={ranked}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#a8a29e' }}
                  tickFormatter={(v: unknown) => `${v}%`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="platformName"
                  tick={<PlatformTick />}
                  axisLine={false}
                  tickLine={false}
                  width={140}
                  interval={0}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: '#f5f5f4' }}
                  formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'Score']}
                />
                <Bar dataKey="displayScore" radius={[0, 4, 4, 0]}>
                  {ranked.map((entry, i) => (
                    <Cell key={i} fill={barFill(entry.displayScore)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
