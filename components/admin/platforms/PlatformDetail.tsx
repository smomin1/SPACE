import Link from 'next/link'
import type { EvaluationState, EvaluatorType, LicenceType, PlatformStatus } from '@prisma/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PencilIcon, Star, ArrowRightIcon } from 'lucide-react'
import { TypeBadge, EvalStateBadge, PlatformStatusDot } from '@/components/admin/_shared/badges'

const LICENCE_LABELS: Partial<Record<LicenceType, string>> = {
  PERPETUAL:    'Perpetual',
  SUBSCRIPTION: 'Subscription',
  PER_SEAT:     'Per Seat',
  SITE_LICENCE: 'Site Licence',
  OPEN_SOURCE:  'Open Source',
}

type PlatformDetailData = {
  id: string
  name: string
  vendor: string
  status: PlatformStatus
  licenceType: LicenceType | null
  trialAvailable: boolean
  evaluatorAssignments: {
    id: string
    evaluatorType: EvaluatorType
    isLead: boolean
    user: { id: string; name: string; email: string }
  }[]
  evaluations: { id: string; state: EvaluationState; createdAt: Date }[]
}

interface PlatformDetailProps {
  platform: PlatformDetailData
}

export function PlatformDetail({ platform }: PlatformDetailProps) {
  const latestEval = platform.evaluations[0] ?? null

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">{platform.name}</h1>
            <PlatformStatusDot value={platform.status} />
          </div>
          <p className="text-stone-500 text-sm">{platform.vendor}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
          asChild
        >
          <Link href={`/admin/platforms/${platform.id}/edit`}>
            <PencilIcon className="mr-1.5 size-3.5" />
            Edit
          </Link>
        </Button>
      </div>

      <Separator className="bg-stone-200" />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Licence Type</p>
          <p className="text-sm text-emerald-950">
            {platform.licenceType ? LICENCE_LABELS[platform.licenceType] : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Trial Available</p>
          <p className="text-sm text-emerald-950">{platform.trialAvailable ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Evaluation Status</p>
          <div className="flex items-center gap-2">
            <EvalStateBadge value={latestEval?.state ?? null} />
            {latestEval && (
              <Link
                href={`/evaluate/${latestEval.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                Open
                <ArrowRightIcon className="size-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <Separator className="bg-stone-200" />

      {/* Evaluators */}
      <div>
        <h2 className="text-sm font-semibold text-emerald-950 mb-3">Evaluators</h2>
        {platform.evaluatorAssignments.length === 0 ? (
          <p className="text-sm text-stone-400">No evaluators assigned.</p>
        ) : (
          <div className="divide-y divide-stone-200/60 rounded-xl border border-stone-200/80 bg-white overflow-hidden">
            {platform.evaluatorAssignments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50/60 transition-colors">
                <TypeBadge value={a.evaluatorType} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-emerald-950">{a.user.name}</p>
                    {a.isLead && (
                      <Star className="size-3 fill-amber-400 text-amber-500 shrink-0" aria-label="Team lead" />
                    )}
                  </div>
                  <p className="text-xs text-stone-400 font-mono">{a.user.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
