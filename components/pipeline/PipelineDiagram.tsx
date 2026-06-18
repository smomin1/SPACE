type Config = {
  aiThreshold: number
  cefrThreshold: number
  vitalThreshold: number
  prdThreshold: number
  aiWeight: number
  cefrWeight: number
  vitalWeight: number
  prdWeight: number
}

// Layout constants
const CW  = 155  // card width
const CH  = 105  // card height
const CY  = 20   // card top y
const HH  = 48   // header height within card
const GAP = 46   // gap between cards (arrow space)
const ST  = CW + GAP  // stride between card left edges (201)
const X0  = 15   // first card left x
const VW  = 900  // viewBox width
const VH  = 262  // viewBox height
const AY  = CY + CH / 2  // horizontal arrow y (≈ 72.5 → 72)

const AGG_CX = X0 + 3 * ST + CW + 67  // aggregate circle center x (= 15+603+155+67=840)
const DQ_Y   = VH - 55                 // disqualified zone top y (= 207)
const DQ_H   = 42

const STAGES = [
  { label: 'AI Screening', thKey: 'aiThreshold'    as const, wKey: 'aiWeight'    as const, color: '#7c3aed', icon: 'ai'   as const },
  { label: 'CEFR',         thKey: 'cefrThreshold'  as const, wKey: 'cefrWeight'  as const, color: '#0d9488', icon: 'cefr' as const },
  { label: 'VITAL',        thKey: 'vitalThreshold' as const, wKey: 'vitalWeight' as const, color: '#2563eb', icon: 'vital' as const },
  { label: 'Tool Eval',    thKey: 'prdThreshold'   as const, wKey: 'prdWeight'   as const, color: '#b45309', icon: 'prd'  as const },
]

type IconType = 'ai' | 'cefr' | 'vital' | 'prd'

function StageIcon({ type, cx, cy }: { type: IconType; cx: number; cy: number }) {
  const tx = cx - 10
  const ty = cy - 10
  const t  = `translate(${tx},${ty})`
  const base = {
    fill: 'none',
    stroke: 'rgba(255,255,255,0.88)' as string,
    strokeWidth: 1.45 as number,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  if (type === 'ai') return (
    <g transform={t} {...base}>
      <rect x="4" y="4" width="12" height="12" rx="1.5" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3"/>
      <rect x="7.5" y="7.5" width="5" height="5" fill="rgba(255,255,255,0.38)" stroke="none"/>
      <line x1="1.5" y1="7.5" x2="4" y2="7.5"/><line x1="1.5" y1="12.5" x2="4" y2="12.5"/>
      <line x1="18.5" y1="7.5" x2="16" y2="7.5"/><line x1="18.5" y1="12.5" x2="16" y2="12.5"/>
      <line x1="7.5" y1="1.5" x2="7.5" y2="4"/><line x1="12.5" y1="1.5" x2="12.5" y2="4"/>
      <line x1="7.5" y1="18.5" x2="7.5" y2="16"/><line x1="12.5" y1="18.5" x2="12.5" y2="16"/>
    </g>
  )

  if (type === 'cefr') return (
    <g transform={t} {...base}>
      <line x1="2" y1="5.5" x2="18" y2="5.5"/>
      <line x1="2" y1="10"  x2="14" y2="10"/>
      <line x1="2" y1="14.5" x2="10" y2="14.5"/>
      <circle cx="16" cy="14" r="3.5" fill="rgba(255,255,255,0.16)" strokeWidth="1.2"/>
      <text x="16" y="16.2" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.92)" stroke="none" fontWeight="700">A</text>
    </g>
  )

  if (type === 'vital') return (
    <g transform={t} {...base}>
      <circle cx="10" cy="6" r="3" fill="rgba(255,255,255,0.18)"/>
      <path d="M3,18 C3,13 17,13 17,18"/>
      <path d="M2,11 L5,11 L7,8 L9.5,14 L11.5,8 L13.5,11 L18,11" strokeWidth="1.2"/>
    </g>
  )

  // prd
  return (
    <g transform={t} {...base}>
      <rect x="4.5" y="3" width="11" height="14.5" rx="1.5" fill="rgba(255,255,255,0.14)" strokeWidth="1.3"/>
      <path d="M7.5,3 V1.8 Q10,0.4 12.5,1.8 V3" fill="rgba(255,255,255,0.2)"/>
      <path d="M7,8.5 L9,10.5 L13,6.5"/>
      <path d="M7,13 L9,15 L13,11"/>
    </g>
  )
}

export function PipelineDiagram({ config }: { config: Config }) {
  const lastCardRight = X0 + 3 * ST + CW  // 773
  const dqLeftCX  = X0 + CW / 2           // 92.5
  const dqRightCX = X0 + 3 * ST + CW / 2  // 695.5
  const dqZoneX   = dqLeftCX - 30
  const dqZoneW   = dqRightCX - dqLeftCX + 60
  const dqCenterX = dqZoneX + dqZoneW / 2

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-4">
        Evaluation pipeline
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="min-w-[580px] w-full max-w-full"
          role="img"
          aria-label="Four-stage evaluation pipeline showing AI Screening, CEFR, VITAL, and Tool Evaluation stages, each with a pass threshold leading to a weighted aggregate score or a disqualified path"
        >
          <defs>
            <marker id="pd-pass" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0.5 L0,5.5 L7,3 Z" fill="#16a34a"/>
            </marker>
            <marker id="pd-fail" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0.5 L0,5.5 L7,3 Z" fill="#dc2626"/>
            </marker>
            <marker id="pd-agg" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0.5 L0,5.5 L7,3 Z" fill="#059669"/>
            </marker>
          </defs>

          {/* ── Stage cards ──────────────────────────────────────── */}
          {STAGES.map((s, i) => {
            const x         = X0 + i * ST
            const cx        = x + CW / 2
            const threshold = config[s.thKey]
            const weight    = config[s.wKey]

            return (
              <g key={s.label}>
                {/* Card base */}
                <rect x={x} y={CY} width={CW} height={CH} rx="8" fill="white" stroke="#e7e5e4" strokeWidth="1"/>

                {/* Colored header (rounded top, flat bottom) */}
                <path
                  d={`M${x+8},${CY} H${x+CW-8} Q${x+CW},${CY} ${x+CW},${CY+8} V${CY+HH} H${x} V${CY+8} Q${x},${CY} ${x+8},${CY} Z`}
                  fill={s.color}
                />

                {/* Stage number (small, top-left) */}
                <text
                  x={x + 12} y={CY + 14}
                  textAnchor="middle" fontSize="9" fontWeight="700"
                  fill="rgba(255,255,255,0.65)" fontFamily="system-ui,sans-serif"
                >
                  {i + 1}
                </text>

                {/* Stage icon centred in header */}
                <StageIcon type={s.icon} cx={cx} cy={CY + HH / 2}/>

                {/* Stage name */}
                <text
                  x={cx} y={CY + HH + 18}
                  textAnchor="middle" fontSize="11" fontWeight="600"
                  fill="#1c1917" fontFamily="system-ui,sans-serif"
                >
                  {s.label}
                </text>

                {/* Threshold */}
                <text
                  x={cx} y={CY + HH + 32}
                  textAnchor="middle" fontSize="9.5"
                  fill="#78716c" fontFamily="system-ui,sans-serif"
                >
                  {`Pass ≥ ${threshold}%`}
                </text>

                {/* Weight pill */}
                <rect x={cx - 18} y={CY + HH + 37} width="36" height="15" rx="7.5" fill={s.color} fillOpacity="0.12"/>
                <text
                  x={cx} y={CY + HH + 48}
                  textAnchor="middle" fontSize="9" fontWeight="600"
                  fill={s.color} fontFamily="system-ui,sans-serif"
                >
                  {`${weight}% wt`}
                </text>
              </g>
            )
          })}

          {/* ── Pass arrows ──────────────────────────────────────── */}
          {[0, 1, 2].map(i => {
            const x1  = X0 + i * ST + CW
            const x2  = X0 + (i + 1) * ST
            const mid = (x1 + x2) / 2
            return (
              <g key={i}>
                <line
                  x1={x1 + 2} y1={AY}
                  x2={x2 - 2} y2={AY}
                  stroke="#16a34a" strokeWidth="2"
                  markerEnd="url(#pd-pass)"
                />
                <text
                  x={mid} y={AY - 5}
                  textAnchor="middle" fontSize="8.5" fontWeight="500"
                  fill="#16a34a" fontFamily="system-ui,sans-serif"
                >
                  Pass
                </text>
              </g>
            )
          })}

          {/* ── Aggregate arrow ──────────────────────────────────── */}
          <line
            x1={lastCardRight + 2} y1={AY}
            x2={AGG_CX - 36}       y2={AY}
            stroke="#059669" strokeWidth="2"
            markerEnd="url(#pd-agg)"
          />

          {/* ── Aggregate score circle ───────────────────────────── */}
          <circle cx={AGG_CX} cy={AY} r={36} fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5"/>
          <text x={AGG_CX} y={AY -  9} textAnchor="middle" fontSize="8.5" fill="#065f46" fontFamily="system-ui,sans-serif">Weighted</text>
          <text x={AGG_CX} y={AY +  3} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#065f46" fontFamily="system-ui,sans-serif">Aggregate</text>
          <text x={AGG_CX} y={AY + 15} textAnchor="middle" fontSize="8.5" fill="#065f46" fontFamily="system-ui,sans-serif">Score</text>

          {/* ── Fail arrows (downward, dashed) ───────────────────── */}
          {STAGES.map((_, i) => {
            const cx = X0 + i * ST + CW / 2
            return (
              <line
                key={i}
                x1={cx} y1={CY + CH + 2}
                x2={cx} y2={DQ_Y - 3}
                stroke="#dc2626" strokeWidth="1.5"
                strokeDasharray="3,2"
                markerEnd="url(#pd-fail)"
              />
            )
          })}

          {/* ── Disqualified zone ────────────────────────────────── */}
          <rect
            x={dqZoneX} y={DQ_Y}
            width={dqZoneW} height={DQ_H}
            rx="8"
            fill="#fef2f2" stroke="#fca5a5" strokeWidth="1"
          />
          {/* X mark */}
          <text
            x={dqZoneX + 26} y={DQ_Y + DQ_H / 2 + 4}
            textAnchor="middle" fontSize="13" fontWeight="700"
            fill="#dc2626" fontFamily="system-ui,sans-serif"
          >
            ✕
          </text>
          <text
            x={dqCenterX + 8} y={DQ_Y + DQ_H / 2 + 4}
            textAnchor="middle" fontSize="11" fontWeight="600"
            fill="#dc2626" fontFamily="system-ui,sans-serif"
          >
            Disqualified: removed from pipeline
          </text>
        </svg>
      </div>
    </div>
  )
}
