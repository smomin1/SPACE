import Link from 'next/link'
import type { EvaluationState, EvaluatorType, LicenceType, PlatformStatus } from '@prisma/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PencilIcon } from 'lucide-react'

const EVAL_STATE_CLS: Record<EvaluationState, string> = {
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  MERGED:      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  FINALISED:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

const EVALUATOR_TYPE_CLS: Record<string, string> = {
  PEDAGOGY:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  TECHNICAL:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  COMPLIANCE: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const LICENCE_LABELS: Partial<Record<LicenceType, string>> = {
  PERPETUAL: 'Perpetual',
  SUBSCRIPTION: 'Subscription',
  PER_SEAT: 'Per Seat',
  SITE_LICENCE: 'Site Licence',
  OPEN_SOURCE: 'Open Source',
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
            <h1 className="text-2xl font-bold tracking-tight">{platform.name}</h1>
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                platform.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              )}
            >
              {platform.status.charAt(0) + platform.status.slice(1).toLowerCase()}
            </span>
          </div>
          <p className="text-muted-foreground">{platform.vendor}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/platforms/${platform.id}/edit`}>
            <PencilIcon className="mr-1.5 size-3.5" />
            Edit
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Licence Type</p>
          <p className="text-sm">
            {platform.licenceType ? LICENCE_LABELS[platform.licenceType] : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Trial Available</p>
          <p className="text-sm">{platform.trialAvailable ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Evaluation Status</p>
          {latestEval ? (
            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', EVAL_STATE_CLS[latestEval.state])}>
              {latestEval.state.replace('_', ' ')}
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              None
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Evaluators */}
      <div>
        <h2 className="text-base font-semibold mb-3">Evaluators</h2>
        {platform.evaluatorAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evaluators assigned.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {platform.evaluatorAssignments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium shrink-0',
                    EVALUATOR_TYPE_CLS[a.evaluatorType]
                  )}
                >
                  {a.evaluatorType.charAt(0) + a.evaluatorType.slice(1).toLowerCase()}
                </span>
                <div>
                  <p className="text-sm font-medium">{a.user.name}</p>
                  <p className="text-xs text-muted-foreground">{a.user.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
