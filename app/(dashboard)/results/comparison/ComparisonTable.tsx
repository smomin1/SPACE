'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { PlatformRow } from './page'
import { FullscreenWrapper } from '@/components/ui/fullscreen-wrapper'

type SortKey = 'name' | 'compliance' | 'overall' | string
type SortDir = 'asc' | 'desc'

function pctColor(pct: number): string {
  if (pct >= 85) return 'text-emerald-700 font-semibold'
  if (pct >= 70) return 'text-emerald-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function pctBarColor(pct: number): string {
  if (pct >= 85) return 'bg-emerald-600'
  if (pct >= 70) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-amber-400'
  return 'bg-red-400'
}

export default function ComparisonTable({
  rows,
  categories,
}: {
  rows: PlatformRow[]
  categories: string[]
}) {
  const params = useSearchParams()
  const showDisqualified = params.has('showDq')
  const selectedCategories = params.get('category')
    ? params.get('category')!.split(',').filter(Boolean)
    : []
  const visibleCategories = selectedCategories.length > 0
    ? categories.filter(c => selectedCategories.includes(c))
    : categories

  const [sortKey, setSortKey] = useState<SortKey>('overall')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const displayed = useMemo(() => {
    const data = showDisqualified ? rows : rows.filter(r => r.status !== 'DISQUALIFIED')

    return [...data].sort((a, b) => {
      let av: number | string | null = null
      let bv: number | string | null = null

      if (sortKey === 'name') {
        av = a.name
        bv = b.name
      } else if (sortKey === 'compliance') {
        av = a.compliancePass === true ? 2 : a.compliancePass === false ? 0 : 1
        bv = b.compliancePass === true ? 2 : b.compliancePass === false ? 0 : 1
      } else if (sortKey === 'overall') {
        av = a.overallPct
        bv = b.overallPct
      } else {
        av = a.categoryScores[sortKey] ?? null
        bv = b.categoryScores[sortKey] ?? null
      }

      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc'
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number)
    })
  }, [rows, showDisqualified, sortKey, sortDir])

  return (
    <FullscreenWrapper title="Platform Comparison">
    <div className="space-y-0">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-stone-200/80 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200/80 bg-stone-50/60">
              <SortTh
                label="Platform"
                sortKey="name"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                align="left"
                className="w-52 sticky left-0 bg-stone-50/95 z-10"
              />
              <SortTh
                label="Compliance"
                sortKey="compliance"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                align="center"
                className="min-w-[110px]"
              />
              {visibleCategories.map(cat => (
                <SortTh
                  key={cat}
                  label={cat}
                  sortKey={cat}
                  current={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  align="right"
                  className="min-w-[130px]"
                />
              ))}
              <SortTh
                label="Overall"
                sortKey="overall"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                align="right"
                className="min-w-[120px]"
              />
              <th className="py-3 px-4 text-left">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                  Recommendation
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleCategories.length + 4}
                  className="py-16 text-center text-sm text-stone-400"
                >
                  No platforms to display
                </td>
              </tr>
            ) : (
              displayed.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-stone-100 last:border-0 hover:bg-stone-50/40"
                >
                  {/* Platform */}
                  <td className="sticky left-0 bg-white py-3 px-4 align-middle z-10 border-r border-stone-100">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[13px] font-semibold leading-tight ${
                            row.status === 'DISQUALIFIED'
                              ? 'text-destructive line-through'
                              : 'text-emerald-950'
                          }`}
                        >
                          {row.name}
                        </span>
                        {row.status === 'DISQUALIFIED' && (
                          <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive ring-1 ring-inset ring-destructive/20">
                            DQ
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400">{row.vendor}</p>
                      {row.evalState && (
                        <span
                          className={`text-[10px] font-medium ${
                            row.evalState === 'FINALISED'
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {row.evalState === 'FINALISED' ? '● Finalised' : '● Merged'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Compliance */}
                  <td className="py-3 px-4 text-center align-middle">
                    <ComplianceCell pass={row.compliancePass} />
                  </td>

                  {/* Category scores */}
                  {visibleCategories.map(cat => (
                    <td key={cat} className="py-3 px-4 text-right align-middle tabular-nums">
                      <ScoreCell pct={row.evalState === null ? undefined : (row.categoryScores[cat] ?? undefined)} />
                    </td>
                  ))}

                  {/* Overall */}
                  <td className="py-3 px-4 text-right align-middle tabular-nums">
                    <ScoreCell pct={row.evalState === null ? undefined : (row.overallPct ?? undefined)} bold />
                  </td>

                  {/* Recommendation */}
                  <td className="py-3 px-4 align-middle">
                    {row.recommendation ? (
                      <RecommendationBadge action={row.recommendation} />
                    ) : (
                      <span className="text-stone-300 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </FullscreenWrapper>
  )
}

function SortTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align,
  className,
}: {
  label: string
  sortKey: string
  current: string
  dir: SortDir
  onSort: (key: string) => void
  align: 'left' | 'center' | 'right'
  className?: string
}) {
  const active = current === sortKey
  const justifyClass =
    align === 'left' ? 'justify-start' : align === 'center' ? 'justify-center' : 'justify-end'

  return (
    <th className={`py-3 px-4 ${className ?? ''}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`flex w-full items-center gap-1 ${justifyClass} text-[10.5px] font-semibold uppercase tracking-wider text-stone-400 hover:text-stone-600 transition-colors`}
      >
        <span className="truncate max-w-[110px]">{label}</span>
        <span className={`shrink-0 text-[9px] ${active ? 'text-emerald-600' : 'text-stone-300'}`}>
          {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </button>
    </th>
  )
}

function ScoreCell({ pct, bold }: { pct?: number; bold?: boolean }) {
  if (pct === undefined) return <span className="text-stone-300 text-xs">-</span>
  return (
    <span className={`text-sm tabular-nums ${bold ? 'font-semibold' : ''} ${pctColor(pct)}`}>
      {pct.toFixed(1)}%
    </span>
  )
}

function ComplianceCell({ pass }: { pass: boolean | null }) {
  if (pass === null)
    return <span className="text-stone-300 text-xs">No gates</span>
  return pass ? (
    <span className="inline-flex items-center justify-center gap-1 text-sm font-medium text-emerald-700">
      <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"
        />
      </svg>
      Pass
    </span>
  ) : (
    <span className="inline-flex items-center justify-center gap-1 text-sm font-medium text-destructive">
      <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z" />
      </svg>
      Fail
    </span>
  )
}

function RecommendationBadge({
  action,
}: {
  action: NonNullable<PlatformRow['recommendation']>
}) {
  const cfg = {
    TOP_PICK:     { label: 'Top Pick',     cls: 'bg-emerald-600 text-white' },
    RECOMMENDED:  { label: 'Recommended',  cls: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/60' },
    CONSIDER:     { label: 'Consider',     cls: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300/60' },
    DISQUALIFIED: { label: 'Disqualified', cls: 'bg-destructive/10 text-destructive ring-1 ring-destructive/20' },
  } as const
  const { label, cls } = cfg[action]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}
