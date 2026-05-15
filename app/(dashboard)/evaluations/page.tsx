import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { EvalStateBadge } from '@/components/admin/_shared/badges'
import { ArrowRightIcon } from 'lucide-react'
import type { EvaluationState, EvaluatorType } from '@prisma/client'
import { cn } from '@/lib/utils'

const TYPE_LABEL: Record<EvaluatorType, string> = {
  COMPLIANCE: 'Compliance',
  PEDAGOGY:   'Pedagogy',
  TECHNICAL:  'Technical',
}

const STATE_ORDER: Record<EvaluationState, number> = {
  IN_PROGRESS: 0,
  MERGED:      1,
  FINALISED:   2,
}

export default async function EvaluationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id: userId, role } = session.user
  const isAdmin = canDo(role, 'manage:platform')

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
              platform: { select: { id: true, name: true, vendor: true } },
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
              platform: { select: { id: true, name: true, vendor: true } },
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

  const sorted = [...rows].sort(
    (a, b) => STATE_ORDER[a.evaluation.state] - STATE_ORDER[b.evaluation.state]
  )

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Evaluations</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {isAdmin ? 'All active evaluation assignments.' : 'Your assigned evaluations.'}
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-stone-200/80 bg-white py-16 text-center text-sm text-stone-400">
          No evaluations assigned yet.
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200/80 bg-white overflow-hidden divide-y divide-stone-200/60">
          {sorted.map((a) => {
            const ev = a.evaluation
            return (
              <Link
                key={a.id}
                href={`/evaluate/${ev.id}`}
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
    </div>
  )
}
