'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2Icon, AlertTriangleIcon } from 'lucide-react'
import type { ScanStatus } from '@prisma/client'

import { ToolScannerForm } from '@/components/tool-scanner/ToolScannerForm'
import { DeleteToolScanButton } from '@/components/tool-scanner/DeleteToolScanButton'
import { ScanStatusBadge } from '@/components/tool-scanner/ScanStatusBadge'

export interface ScanRow {
  id: string
  platformName: string
  url: string
  status: ScanStatus
  error: string | null
  coveragePct: number
  createdAt: string
}

const POLL_ACTIVE_MS = 4000
const POLL_IDLE_MS = 20000

function hostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function ToolScannerDashboard({ initialRows }: { initialRows: ScanRow[] }) {
  const [rows, setRows] = React.useState<ScanRow[]>(initialRows)

  const refetch = React.useCallback(async () => {
    try {
      const res = await fetch('/api/tool-scanner/evaluations', { cache: 'no-store' })
      if (res.ok) setRows((await res.json()) as ScanRow[])
    } catch {
      // transient network error; next poll will retry
    }
  }, [])

  const active = rows.filter((r) => r.status === 'QUEUED' || r.status === 'SCANNING')
  const failed = rows.filter((r) => r.status === 'FAILED')
  const completed = rows.filter((r) => r.status === 'COMPLETED')
  const hasActive = active.length > 0

  // Poll fast while scans are in flight, slowly otherwise so the queue/"currently
  // scanning" view stays live for everyone without hammering the server.
  React.useEffect(() => {
    const interval = hasActive ? POLL_ACTIVE_MS : POLL_IDLE_MS
    const id = setInterval(refetch, interval)
    return () => clearInterval(id)
  }, [hasActive, refetch])

  return (
    <div className="space-y-6">
      <ToolScannerForm onQueued={refetch} />

      {/* Active queue: visible to everyone so the same app isn't started twice */}
      {active.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-emerald-700/15 bg-emerald-50/40">
          <div className="flex items-baseline justify-between border-b border-emerald-700/10 px-5 py-3">
            <h2 className="font-serif text-[16px] tracking-tight text-emerald-950">
              In progress &amp; queued
            </h2>
            <span className="font-mono text-[11px] tabular-nums uppercase tracking-wider text-emerald-800/70">
              {active.length} active
            </span>
          </div>
          <ul className="divide-y divide-emerald-700/10">
            {active.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {row.status === 'SCANNING' ? (
                    <Loader2Icon className="size-4 shrink-0 animate-spin text-emerald-700" />
                  ) : (
                    <span className="size-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-emerald-950">
                      {row.status === 'SCANNING' ? `Scanning ${row.platformName}…` : row.platformName}
                    </p>
                    <p className="truncate text-[11.5px] text-stone-500">{hostname(row.url)}</p>
                  </div>
                </div>
                <ScanStatusBadge value={row.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Failed scans: show the error; delete to re-add */}
      {failed.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-red-700/20 bg-red-50/30">
          <div className="border-b border-red-700/10 px-5 py-3">
            <h2 className="font-serif text-[16px] tracking-tight text-red-900">Failed</h2>
          </div>
          <ul className="divide-y divide-red-700/10">
            {failed.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-4 px-5 py-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-700" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-red-900">
                      {row.platformName}
                    </p>
                    <p className="text-[11.5px] text-red-900/80">
                      {row.error ?? 'Scan failed.'} Delete to re-add.
                    </p>
                  </div>
                </div>
                <DeleteToolScanButton
                  id={row.id}
                  platformName={row.platformName}
                  onDeleted={refetch}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Completed evaluations */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-[18px] tracking-tight text-emerald-950">
            Past evaluations
          </h2>
          <span className="font-mono text-[11px] tabular-nums uppercase tracking-wider text-stone-500">
            {completed.length} total
          </span>
        </div>

        {completed.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/30 px-6 py-12 text-center">
            <p className="text-[13px] text-stone-500">
              No completed evaluations yet. Add one above.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-stone-200/80 bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-stone-50/60">
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                    Platform
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                    URL
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                    Coverage
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {completed.map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/40">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/tool-scanner/${row.id}`}
                        className="font-medium text-emerald-950 hover:text-emerald-800 hover:underline"
                      >
                        {row.platformName}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-stone-500">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-emerald-800"
                      >
                        {hostname(row.url)}
                      </a>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-emerald-950">
                      {row.coveragePct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-stone-500">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DeleteToolScanButton
                        id={row.id}
                        platformName={row.platformName}
                        onDeleted={refetch}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
