'use client'

import * as React from 'react'
import * as XLSX from 'xlsx'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ToolScannerScoreBadge } from '@/components/tool-scanner/ToolScannerScoreBadge'

interface MatrixPlatform {
  id: string
  platformName: string
  scoresMap: Record<string, number>
}

interface MatrixReq {
  id: string
  title: string
  category: string
  weight: string
}

export function ScoringMatrix({
  platforms,
  requirements,
}: {
  platforms: MatrixPlatform[]
  requirements: MatrixReq[]
}) {
  const allCategories = React.useMemo(
    () => Array.from(new Set(requirements.map((r) => r.category))).sort(),
    [requirements],
  )

  const [selectedPlatforms, setSelectedPlatforms] = React.useState<string[]>(
    platforms.map((p) => p.id),
  )
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(allCategories)

  const visiblePlatforms = platforms.filter((p) => selectedPlatforms.includes(p.id))
  const visibleRequirements = requirements.filter((r) =>
    selectedCategories.includes(r.category),
  )

  function togglePlatform(id: string) {
    setSelectedPlatforms((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    )
  }
  function toggleCategory(cat: string) {
    setSelectedCategories((cur) =>
      cur.includes(cat) ? cur.filter((x) => x !== cat) : [...cur, cat],
    )
  }

  function downloadExcel() {
    const header = ['Requirement', 'Category', 'Weight', ...visiblePlatforms.map((p) => p.platformName)]
    const rows: (string | number)[][] = [header]
    for (const r of visibleRequirements) {
      const row: (string | number)[] = [r.title, r.category, r.weight]
      for (const p of visiblePlatforms) {
        row.push(p.scoresMap[r.id] ?? 0)
      }
      rows.push(row)
    }
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Scoring Matrix')
    XLSX.writeFile(wb, 'search-scoring-matrix.xlsx')
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

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="grid gap-4 rounded-lg border border-stone-200/80 bg-white p-4 shadow-sm md:grid-cols-2">
        <div>
          <Label className="text-[12px] text-stone-600">Platforms</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={
                  'h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors ' +
                  (selectedPlatforms.includes(p.id)
                    ? 'bg-emerald-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200')
                }
              >
                {p.platformName}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[12px] text-stone-600">Categories</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allCategories.map((c) => (
              <button
                key={c}
                onClick={() => toggleCategory(c)}
                className={
                  'h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors ' +
                  (selectedCategories.includes(c)
                    ? 'bg-emerald-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200')
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-stone-500">
          {visibleRequirements.length} requirement{visibleRequirements.length !== 1 ? 's' : ''} ×{' '}
          {visiblePlatforms.length} platform{visiblePlatforms.length !== 1 ? 's' : ''}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadExcel}
          disabled={visiblePlatforms.length === 0 || visibleRequirements.length === 0}
        >
          <DownloadIcon className="mr-1.5 size-3.5" />
          Download Matrix
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200/80 bg-white shadow-sm">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-stone-50/60">
              <th className="sticky left-0 z-10 bg-stone-50/60 px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                Requirement
              </th>
              <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                Category
              </th>
              <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                Weight
              </th>
              {visiblePlatforms.map((p) => (
                <th
                  key={p.id}
                  className="px-3 py-2.5 text-center text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55"
                >
                  {p.platformName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/60">
            {visibleRequirements.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50/30">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 text-emerald-950">
                  {r.title}
                </td>
                <td className="px-3 py-2 text-stone-600">{r.category}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-stone-500">{r.weight}</td>
                {visiblePlatforms.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-center">
                    <ToolScannerScoreBadge value={p.scoresMap[r.id] ?? 0} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
