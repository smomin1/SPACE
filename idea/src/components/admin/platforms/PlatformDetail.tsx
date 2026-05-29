import Link from 'next/link'
import type {
  EvaluationState,
  EvaluatorType,
  LicenceType,
  PlatformStatus,
} from '@prisma/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PencilIcon, ListChecksIcon } from 'lucide-react'
import {
  EvalStateBadge,
  PlatformStatusDot,
  TypeBadge,
} from '@/components/admin/_shared/badges'

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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')
}

export function PlatformDetail({ platform }: PlatformDetailProps) {
  const latestEval = platform.evaluations[0] ?? null

  return (
    <div className="space-y-8">
      {/* Breadcrumb + header */}
      <div className="space-y-4">
        <nav className="text-[12px] text-stone-500">
          <Link href="/admin/platforms" className="hover:text-emerald-800">
            Platforms
          </Link>
          <span className="mx-1.5 text-stone-300">/</span>
          <span className="text-emerald-950">{platform.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-6 border-b border-stone-200/70 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-[32px] leading-[1.05] tracking-tight text-emerald-950">
                {platform.name}
              </h1>
              <PlatformStatusDot value={platform.status} />
            </div>
            <p className="text-[14px] text-stone-600">{platform.vendor}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/platforms/${platform.id}/evaluation`}>
                <ListChecksIcon className="mr-1.5 size-3.5" />
                Open evaluation
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/admin/platforms/${platform.id}/edit`}>
                <PencilIcon className="mr-1.5 size-3.5" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Facts strip */}
      <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
        <div className="grid grid-cols-3 divide-x divide-stone-200/70">
          <Fact
            label="Licence type"
            value={
              platform.licenceType ? (
                <span className="text-emerald-950">{LICENCE_LABELS[platform.licenceType]}</span>
              ) : (
                <span className="text-stone-400">—</span>
              )
            }
          />
          <Fact
            label="Trial available"
            value={
              platform.trialAvailable ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-800">
                  <span className="size-1.5 rounded-full bg-emerald-600" />
                  Yes
                </span>
              ) : (
                <span className="text-stone-500">No</span>
              )
            }
          />
          <Fact
            label="Evaluation status"
            value={latestEval ? <EvalStateBadge value={latestEval.state} /> : <EvalStateBadge value={null} />}
          />
        </div>
      </div>

      {/* Evaluators */}
      <section className="space-y-3">
        <header className="flex items-baseline justify-between">
          <div>
            <h2 className="font-serif text-[20px] tracking-tight text-emerald-950">Evaluation team</h2>
            <p className="mt-0.5 text-[12.5px] text-stone-500">
              Pedagogy and Technical reviewers are required. Compliance reviewers are optional but
              recommended where gated requirements apply.
            </p>
          </div>
          <Button variant="ghost" size="sm">
            Manage
          </Button>
        </header>

        {platform.evaluatorAssignments.length === 0 ? (
          <div className="rounded-xl border border-stone-200/80 bg-white px-6 py-10 text-center">
            <p className="text-[13.5px] text-stone-500">No evaluators assigned.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
            <div className="divide-y divide-stone-200/60">
              {platform.evaluatorAssignments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-900/8 text-[12px] font-medium tracking-wide text-emerald-900 ring-1 ring-emerald-900/12">
                    {initials(a.user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-emerald-950">{a.user.name}</p>
                    <p className="font-mono text-[12px] text-stone-500">{a.user.email}</p>
                  </div>
                  <TypeBadge value={a.evaluatorType} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-950/55">
        {label}
      </p>
      <div className="mt-2 text-[14px]">{value}</div>
    </div>
  )
}
