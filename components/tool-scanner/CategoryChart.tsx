'use client'

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

export type CategoryPoint = {
  category: string
  pct: number
}

function barFill(pct: number): string {
  if (pct >= 85) return '#059669'
  if (pct >= 70) return '#10b981'
  if (pct >= 50) return '#f59e0b'
  return '#ef4444'
}

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e7e5e4',
  borderRadius: 4,
  fontSize: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
}

export function CategoryChart({ data }: { data: CategoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 40, left: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 10.5, fill: '#78716c' }}
          axisLine={false}
          tickLine={false}
          angle={-30}
          textAnchor="end"
          interval={0}
          height={50}
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
          formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'Score']}
        />
        <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={barFill(entry.pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
