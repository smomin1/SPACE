'use client'

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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
  pct: number | null
}

type Props = {
  data: CategoryPoint[]
  chartType: 'bar' | 'radar'
  platformName: string
}

function barFill(pct: number | null): string {
  if (pct === null)  return '#e7e5e4'
  if (pct >= 85)     return '#059669'
  if (pct >= 70)     return '#10b981'
  if (pct >= 50)     return '#f59e0b'
  return '#ef4444'
}

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e7e5e4',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
}

export function CategoryChart({ data, chartType, platformName }: Props) {
  // Normalise nulls to 0 for chart rendering; track which are real zeros
  const chartData = data.map(d => ({ ...d, pct: d.pct ?? 0 }))

  const canRadar = chartData.length >= 3

  if (chartType === 'radar' && canRadar) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="#e7e5e4" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 10.5, fill: '#78716c' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tickCount={4}
            tick={{ fontSize: 9, fill: '#a8a29e' }}
            tickFormatter={(v: unknown) => `${v}%`}
          />
          <Radar
            name={platformName}
            dataKey="pct"
            stroke="#059669"
            fill="#059669"
            fillOpacity={0.18}
            dot={{ r: 3, fill: '#059669', strokeWidth: 0 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'Score']}
          />
        </RadarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 8, bottom: 24, left: 0 }}
        barSize={28}
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
          {chartData.map((entry, i) => (
            <Cell key={i} fill={barFill(data[i].pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
