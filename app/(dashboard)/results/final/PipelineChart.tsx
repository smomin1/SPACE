'use client'

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

export type PipelineRow = {
  name: string
  'AI Screening': number | null
  'CEFR': number | null
  'VITAL': number | null
  'Tool Eval': number | null
  aggregate: number
}

const STAGE_COLORS = {
  'AI Screening': '#a78bfa',
  'CEFR':         '#34d399',
  'VITAL':        '#60a5fa',
  'Tool Eval':    '#f59e0b',
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number | null; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-md text-[12px] space-y-1">
      <p className="font-semibold text-stone-800 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-stone-500">{p.name}</span>
          <span className="ml-auto font-medium tabular-nums text-stone-700">
            {p.value != null ? `${p.value.toFixed(0)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PipelineBarChart({ rows }: { rows: PipelineRow[] }) {
  const data = rows.map((r) => ({
    name: r.name,
    'AI Screening': r['AI Screening'],
    'CEFR': r['CEFR'],
    'VITAL': r['VITAL'],
    'Tool Eval': r['Tool Eval'],
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barGap={2} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#78716c' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#a8a29e' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f4' }} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#78716c', paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        {(Object.keys(STAGE_COLORS) as (keyof typeof STAGE_COLORS)[]).map((stage) => (
          <Bar
            key={stage}
            dataKey={stage}
            fill={STAGE_COLORS[stage]}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AggregateBarChart({ rows }: { rows: PipelineRow[] }) {
  const sorted = [...rows].sort((a, b) => b.aggregate - a.aggregate)

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, sorted.length * 44)}>
      <BarChart data={sorted} layout="vertical" barCategoryGap="35%">
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
