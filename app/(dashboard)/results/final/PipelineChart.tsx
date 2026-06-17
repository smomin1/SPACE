'use client'

import { useState } from 'react'
import { Maximize2Icon, XIcon } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

export type PipelineRow = {
  name: string
  'AI Screening': number | null
  'CEFR': number | null
  'VITAL': number | null
  'Tool Eval': number | null
  aggregate: number
}

const STAGES = ['AI Screening', 'CEFR', 'VITAL', 'Tool Eval'] as const

function cellStyle(val: number | null): string {
  if (val === null) return 'bg-stone-100 text-stone-400'
  if (val >= 70)   return 'bg-emerald-100 text-emerald-800'
  if (val >= 50)   return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-700'
}

function aggStyle(val: number): string {
  if (val >= 70) return 'bg-emerald-600 text-white'
  if (val >= 50) return 'bg-amber-500 text-white'
  return 'bg-red-500 text-white'
}

function HeatmapTable({ rows }: { rows: PipelineRow[] }) {
  return (
    <table className="w-full text-[12px] border-collapse">
      <thead>
        <tr>
          <th className="text-left py-2 px-3 text-[10.5px] font-medium uppercase tracking-wider text-stone-400">Platform</th>
          {STAGES.map(s => (
            <th key={s} className="py-2 px-2 text-center text-[10.5px] font-medium uppercase tracking-wider text-stone-400">{s}</th>
          ))}
          <th className="py-2 px-2 text-center text-[10.5px] font-medium uppercase tracking-wider text-stone-400">Aggregate</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {rows.map((row) => (
          <tr key={row.name} className="hover:bg-stone-50/60 transition-colors">
            <td className="py-2.5 px-3 font-medium text-stone-800 max-w-[160px] truncate">{row.name}</td>
            {STAGES.map(s => (
              <td key={s} className="py-2.5 px-2 text-center">
                <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums min-w-[42px] ${cellStyle(row[s])}`}>
                  {row[s] != null ? `${row[s]!.toFixed(0)}%` : '—'}
                </span>
              </td>
            ))}
            <td className="py-2.5 px-2 text-center">
              <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums min-w-[42px] ${aggStyle(row.aggregate)}`}>
                {row.aggregate.toFixed(0)}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PipelineHeatmap({ rows }: { rows: PipelineRow[] }) {
  const [open, setOpen] = useState(false)
  const preview = rows.slice(0, 10)
  const hasMore = rows.length > 10

  return (
    <>
      <div className="rounded-xl border border-stone-200/80 bg-white p-5">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Stage scores</p>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <Maximize2Icon className="size-3" />
            View all
          </button>
        </div>
        <HeatmapTable rows={preview} />
        {hasMore && (
          <p className="mt-2 text-[11px] text-stone-400 text-center">
            Showing top {preview.length} of {rows.length} platforms
            {' · '}
            <button onClick={() => setOpen(true)} className="text-emerald-700 hover:underline">view all</button>
          </p>
        )}
        <p className="mt-2 text-[10.5px] text-stone-400">Green ≥ 70% · Amber 50–69% · Red &lt; 50%</p>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0">
              <div>
                <p className="font-semibold text-emerald-950">Stage scores — all platforms</p>
                <p className="text-[12px] text-stone-400 mt-0.5">{rows.length} pipeline-complete platforms</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              <HeatmapTable rows={rows} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function AggregateBarChart({ rows }: { rows: PipelineRow[] }) {
  const [open, setOpen] = useState(false)
  const preview = rows.slice(0, 10)
  const hasMore = rows.length > 10

  function Chart({ data }: { data: PipelineRow[] }) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
        <BarChart data={data} layout="vertical" barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#a8a29e' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            formatter={(v: unknown) => [`${(v as number).toFixed(1)}%`, 'Aggregate']}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e7e5e4' }}
            cursor={{ fill: '#f5f5f4' }}
          />
          <Bar dataKey="aggregate" fill="#059669" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-stone-200/80 bg-white p-5">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Aggregate score ranking</p>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <Maximize2Icon className="size-3" />
            View all
          </button>
        </div>
        <Chart data={preview} />
        {hasMore && (
          <p className="mt-2 text-[11px] text-stone-400 text-center">
            Showing top {preview.length} of {rows.length} platforms
            {' · '}
            <button onClick={() => setOpen(true)} className="text-emerald-700 hover:underline">view all</button>
          </p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0">
              <div>
                <p className="font-semibold text-emerald-950">Aggregate score ranking — all platforms</p>
                <p className="text-[12px] text-stone-400 mt-0.5">{rows.length} pipeline-complete platforms, ranked by weighted aggregate</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              <Chart data={rows} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
