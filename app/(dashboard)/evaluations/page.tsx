import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { EvalStateBadge } from '@/components/admin/_shared/badges'
import { PageHeader } from '@/components/shared/PageHeader'
import { ArrowRightIcon, ClipboardCheckIcon } from 'lucide-react'
import type { EvaluationState, EvaluatorType, EvaluationTrack } from '@prisma/client'
import { cn } from '@/lib/utils'

const TYPE_LABEL: Record<EvaluatorType, string> = {
  PEDAGOGY:  'Pedagogy',
  TECHNICAL: 'Technical',
  VITAL:     'VITAL',
  BOTH:      'Both',
}

const STATE_ORDER: Record<EvaluationState, number> = {
  IN_PROGRESS: 0,
  MERGED:      1,
  FINALISED:   2,
}

export default async function EvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id: userId, role } = session.user
  const isAdmin = canDo(role, 'manage:platform')
  const isVitalEvaluator = role === 'VITAL_EVALUATOR'
  const { track: trackParam } = await searchParams
  const activeTrack: EvaluationTrack = trackParam === 'VITAL' ? 'VITAL' : 'TOOL'

  // Admins see all evaluations; evaluators see only their assignments
  const assignments = isAdmin
    ? await prisma.evaluatorAssignment.findMany({
        orderBy: [{ evaluation: { state: 'asc' } }, { createdAt: 'desc' }],
        select: {
          id: true,
          evaluatorType: true,
          hasSubmitted: true,
          isLead: true,
          evaluation: {
            select: {
              id: true,
              state: true,
              createdAt: true,
              platform: { select: { id: true, name: true, vendor: true, track: true } },
            },
          },
          user: { select: { id: true, name: true } },
        },
      })
    : await prisma.evaluatorAssignment.findMany({
        where: { userId },
        orderBy: [{ evaluation: { state: 'asc' } }, { createdAt: 'desc' }],
        select: {
          id: true,
          evaluatorType: true,
          hasSubmitted: true,
          isLead: true,
          evaluation: {
            select: {
              id: true,
              state: true,
              createdAt: true,
              platform: { select: { id: true, name: true, vendor: true, track: true } },
            },
          },
          user: { select: { id: true, name: true } },
        },
      })

  // Deduplicate by evaluationId (admins may have multiple assignments per eval)
  const seen = new Set<string>()
  const rows = isAdmin
    ? assignments.filter(a => {
        if (seen.has(a.evaluation.id)) return false
        seen.add(a.evaluation.id)
        return true
      })
    : assignments

  // Admins switch tracks via tabs; evaluators see all their own assignments.
  const visible = isAdmin
    ? rows.filter((a) => (a.evaluation.platform.track ?? 'TOOL') === activeTrack)
    : rows

  const sorted = [...visible].sort(
    (a, b) => STATE_ORDER[a.evaluation.state] - STATE_ORDER[b.evaluation.state]
  )

  const trackCounts = {
    TOOL: rows.filter((a) => (a.evaluation.platform.track ?? 'TOOL') === 'TOOL').length,
    VITAL: rows.filter((a) => a.evaluation.platform.track === 'VITAL').length,
  }

  return (
    <div>
      <PageHeader
        icon={ClipboardCheckIcon}
        kicker={
          isAdmin
            ? 'Layer 2: Evaluations'
            : isVitalEvaluator
              ? 'Layer 2: VITAL Profile'
              : 'Layer 2: Tool Evaluator'
        }
        title="Evaluations"
        description={
          isAdmin
            ? 'All active evaluation assignments.'
            : isVitalEvaluator
              ? 'Your assigned VITAL profiles. Submit to rerun the recommendation engine.'
              : 'Your assigned evaluations.'
        }
      />
      <main className="mx-auto max-w-7xl px-6 py-6">

      {isAdmin && (
        <div className="mb-5 inline-flex rounded-lg border border-stone-200/80 bg-white p-1">
          {([
            { key: 'TOOL', label: 'Tool Evaluator' },
            { key: 'VITAL', label: 'VITAL' },
          ] as const).map((t) => (
            <Link
              key={t.key}
              href={`/evaluations?track=${t.key}`}
              className={cn(
                'rounded-md px-3.5 h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors',
                activeTrack === t.key
                  ? 'bg-emerald-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              )}
            >
              {t.label}
              <span className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-semibold',
                activeTrack === t.key ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              )}>
                {trackCounts[t.key]}
              </span>
            </Link>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-stone-200/80 bg-white py-16 text-center text-sm text-stone-400">
          No evaluations assigned yet.
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200/80 bg-white overflow-hidden divide-y divide-stone-200/60">
          {sorted.map((a) => {
            const ev = a.evaluation
            const href = ev.platform.track === 'VITAL'
              ? `/vital-evaluate/${ev.id}`
              : `/evaluate/${ev.id}`
            return (
              <Link
                key={a.id}
                href={href}
                className="flex items-center gap-4 px-5 py-4 hover:bg-emerald-900/[0.025] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-emerald-950">
                      {ev.platform.name}
                    </span>
                    {!isAdmin && a.isLead && (
                      <span className="inline-flex items-center rounded-md bg-amber-50 ring-1 ring-inset ring-amber-300/60 px-1.5 h-[18px] text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                        Lead
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-stone-400">{ev.platform.vendor}</span>
                    {!isAdmin && (
                      <>
                        <span className="text-stone-300">·</span>
                        <span className="text-xs text-stone-400">{TYPE_LABEL[a.evaluatorType]}</span>
                        <span className="text-stone-300">·</span>
                        <span className={cn(
                          'text-xs font-medium',
                          a.hasSubmitted ? 'text-emerald-700' : 'text-stone-400'
                        )}>
                          {a.hasSubmitted ? 'Submitted' : 'Not submitted'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <EvalStateBadge value={ev.state} />
                <ArrowRightIcon className="size-4 text-stone-300 group-hover:text-emerald-700 transition-colors shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
      </main>
    </div>
  )
}
