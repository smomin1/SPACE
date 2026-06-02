'use client'

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { VitalRisk, VitalVerdict } from '@prisma/client'
import { VERDICT_LABEL, RISK_LABEL } from '@/lib/vital/labels'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type VitalScatterPoint = {
  id: string
  name: string
  vendor: string
  overall: number
  vital10: number
  risk: VitalRisk | null
  verdict: VitalVerdict | null
}

// ─── Constants ─────────────────────────────────────────────────────────────────

// De-facto risk drives dot colour: green = low, amber = medium, red = high.
const RISK_COLOR: Record<VitalRisk, string> = {
  LOW: '#1A6B45',
  MEDIUM: '#D4921A',
  HIGH: '#DC2626',
}
const NO_RISK_COLOR = '#a8a29e'

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e7e5e4',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}

function colorOf(risk: VitalRisk | null): string {
  return risk ? RISK_COLOR[risk] : NO_RISK_COLOR
}

// ─── Tooltip ───────────────────────────────────────────────────────────────────

function VitalTooltip({ active, payload }: {
  active?: boolean
  payload?: { payload: VitalScatterPoint }[]
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <p className="text-[12.5px] font-semibold text-emerald-950">{p.name}</p>
      {p.vendor && p.vendor !== p.name && (
        <p className="text-[11px] text-stone-400">{p.vendor}</p>
      )}
      <div className="mt-1.5 space-y-0.5 text-[11.5px] text-stone-600">
        <p>Tool score: <span className="font-medium tabular-nums">{p.overall.toFixed(1)}%</span></p>
        <p>VITAL: <span className="font-medium tabular-nums">{p.vital10}/10</span></p>
        {p.verdict && <p>Verdict: <span className="font-medium">{VERDICT_LABEL[p.verdict]}</span></p>}
        <p className="flex items-center gap-1.5">
          Risk:
          <span className="inline-flex items-center gap-1 font-medium">
            <span className="size-2 rounded-full" style={{ backgroundColor: colorOf(p.risk) }} />
            {p.risk ? RISK_LABEL[p.risk] : 'Unrated'}
          </span>
        </p>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────

export function VitalScatter({ points }: { points: VitalScatterPoint[] }) {
  const risksPresent = Array.from(
    new Set(points.map((p) => p.risk).filter((r): r is VitalRisk => r !== null)),
  )
  const hasUnrated = points.some((p) => p.risk === null)

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-stone-700">Tool score vs VITAL profile</h3>
        <span className="text-[11px] text-stone-400">
          {points.length} linked {points.length === 1 ? 'platform' : 'platforms'}
        </span>
      </div>
      <p className="mb-4 text-xs text-stone-400">
        Each point is a platform linked to a VITAL tool. Top-right is the sweet spot: a strong
        structured Tool score and a high VITAL pedagogy score.
      </p>

      <div style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 20, bottom: 36, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
            <XAxis
              type="number"
              dataKey="overall"
              name="Tool score"
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 10.5, fill: '#a8a29e' }}
              axisLine={false}
              tickLine={false}
              label={{
                value: 'Tool evaluator score',
                position: 'insideBottom',
                offset: -18,
                fontSize: 11,
                fill: '#78716c',
              }}
            />
            <YAxis
              type="number"
              dataKey="vital10"
              name="VITAL"
              domain={[0, 10]}
              tickCount={6}
              tick={{ fontSize: 10.5, fill: '#a8a29e' }}
              axisLine={false}
              tickLine={false}
              width={40}
              label={{
                value: 'VITAL / 10',
                angle: -90,
                position: 'insideLeft',
                offset: 14,
                fontSize: 11,
                fill: '#78716c',
              }}
            />
            <ZAxis range={[90, 90]} />
            <ReferenceLine x={70} stroke="#e7e5e4" strokeDasharray="4 4" />
            <ReferenceLine y={6} stroke="#e7e5e4" strokeDasharray="4 4" />
            <Tooltip content={<VitalTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#d6d3d1' }} />
            <Scatter data={points} fillOpacity={0.85}>
              {points.map((p) => (
                <Cell key={p.id} fill={colorOf(p.risk)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-stone-100 pt-4">
        {risksPresent.map((r) => (
          <span key={r} className="flex items-center gap-1.5 text-[12px] text-stone-600">
            <span className="size-3 rounded-full" style={{ backgroundColor: RISK_COLOR[r] }} />
            {RISK_LABEL[r]} risk
          </span>
        ))}
        {hasUnrated && (
          <span className="flex items-center gap-1.5 text-[12px] text-stone-600">
            <span className="size-3 rounded-full" style={{ backgroundColor: NO_RISK_COLOR }} />
            Unrated
          </span>
        )}
      </div>
    </div>
  )
}
