'use client'

import { usePathname } from 'next/navigation'
import { InfoIcon } from 'lucide-react'

const FINAL_PATHS = ['/results/final']

export function DataScopeNote() {
  const pathname = usePathname()
  if (FINAL_PATHS.some((p) => pathname === p || pathname.startsWith(p + '?'))) return null

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-stone-200/80 bg-stone-50/80 px-4 py-2.5 text-[12px] text-stone-500 mb-4">
      <InfoIcon className="size-3.5 mt-0.5 shrink-0 text-stone-400" />
      <span>
        <span className="font-medium text-stone-600">Tool Evaluator data only.</span>
        {' '}Scores on this page are derived from Tool Evaluator (PRD) assessments.
        CEFR alignment, VITAL profiles, and AI Screening results are consolidated in the{' '}
        <a href="/results/final" className="font-medium text-emerald-700 hover:underline">Final Report</a>.
      </span>
    </div>
  )
}
