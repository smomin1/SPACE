import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { EvalStateBadge, StatusChip } from '@/components/admin/_shared/badges'
import { PageHeader } from '@/components/shared/PageHeader'
import { ArrowRightIcon, ClipboardCheckIcon } from 'lucide-react'
import type { EvaluationState, EvaluatorType, EvaluationTrack } from '@prisma/client'
import { cn } from '@/lib/utils'
import { GapBadge } from './GapScoringPanel'

const TYPE_LABEL: Record<EvaluatorType, string> = {
  PEDAGOGY:  'Pedagogy',
  TECHNICAL: 'Technical',
  VITAL:     'VITAL',
  BOTH:      'Both',
  CEFR:      'CEFR',
}

const STATE_ORDER: Record<EvaluationState, number> = {
  IN_PROGRESS: 0,
  MERGED:      1,
  FINALISED:   2,
}

// Which Evaluations tab an assignment belongs to is driven by its evaluator type,
// not the platform's current track — a platform that has advanced from CEFR to
// VITAL keeps its (done) CEFR assignment in the CEFR tab and its new VITAL
// assignment in the VITAL tab.
function tabOf(type: EvaluatorType): EvaluationTrack {
  return type === 'VITAL' ? 'VITAL' : type === 'CEFR' ? 'CEFR' : 'TOOL'
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
  const activeTrack: EvaluationTrack = trackParam === 'VITAL' ? 'VITAL' : trackParam === 'CEFR' ? 'CEFR' : 'TOOL'

  const assignmentSelect = {
    id: true,
    evaluatorType: true,
    hasSubmitted: true,
    isLead: true,
    evaluation: {
      select: {
        id: true,
        state: true,
        createdAt: true,
        platform: {
          select: {
            id: true,
            name: true,
            vendor: true,
            track: true,
            cefrEvaluation: { select: { status: true } },
          },
        },
      },
    },
    user: { select: { id: true, name: true } },
  }

  // Admins see all evaluations; evaluators see only their assignments
  const assignments = isAdmin
    ? await prisma.evaluatorAssignment.findMany({
        orderBy: [{ evaluation: { state: 'asc' } }, { createdAt: 'desc' }],
        select: assignmentSelect,
      })
    : await prisma.evaluatorAssignment.findMany({
        where: { userId },
        orderBy: [{ evaluation: { state: 'asc' } }, { createdAt: 'desc' }],
        select: assignmentSelect,
      })

  // Bucket each assignment into a tab by its evaluator type. Admins get one row per
  // evaluation per tab (a TOOL eval has Pedagogy + Technical assignments → one row);
  // evaluators see each of their own assignments.
  const byTab: Record<EvaluationTrack, typeof assignments> = { TOOL: [], VITAL: [], CEFR: [] }
  const seenPerTab: Record<EvaluationTrack, Set<string>> = { TOOL: new Set(), VITAL: new Set(), CEFR: new Set() }
  for (const a of assignments) {
    const tab = tabOf(a.evaluatorType)
    if (isAdmin) {
      if (seenPerTab[tab].has(a.evaluation.id)) continue
      seenPerTab[tab].add(a.evaluation.id)
    }
    byTab[tab].push(a)
  }

  // Admins switch tracks via tabs; evaluators see all their own assignments.
  const visible = isAdmin ? byTab[activeTrack] : assignments

  const sorted = [...visible].sort(
    (a, b) => STATE_ORDER[a.evaluation.state] - STATE_ORDER[b.evaluation.state]
  )

  const trackCounts = {
    TOOL: byTab.TOOL.length,
    VITAL: byTab.VITAL.length,
    CEFR: byTab.CEFR.length,
  }

  // Gap counts: for admin only, compute how many requirements have no scores per TOOL evaluation
  const gapCounts: Record<string, number> = {}
  if (isAdmin) {
    const toolEvalIds = byTab.TOOL.map((a) => a.evaluation.id)

    if (toolEvalIds.length > 0) {
      const [allToolReqs, scoredGroups] = await Promise.all([
        prisma.requirement.findMany({
          where: { evaluatorType: { in: ['PEDAGOGY', 'TECHNICAL', 'BOTH'] } },
          select: { id: true },
        }),
        prisma.score.groupBy({
          by: ['evaluationId', 'requirementId'],
          where: { evaluationId: { in: toolEvalIds } },
        }),
      ])

      const totalReqs = allToolReqs.length
      const scoredPerEval = new Map<string, Set<string>>()
      for (const s of scoredGroups) {
        if (!scoredPerEval.has(s.evaluationId)) scoredPerEval.set(s.evaluationId, new Set())
        scoredPerEval.get(s.evaluationId)!.add(s.requirementId)
      }
      for (const evalId of toolEvalIds) {
        const scored = scoredPerEval.get(evalId)?.size ?? 0
        gapCounts[evalId] = Math.max(0, totalReqs - scored)
      }
    }
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
            { key: 'CEFR', label: 'CEFR Evaluations' },
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
            // Route by the assignment's evaluator type (CEFR is platform-scoped).
            const href =
              a.evaluatorType === 'VITAL' ? `/vital-evaluate/${ev.id}`
              : a.evaluatorType === 'CEFR' ? `/cefr-evaluate/${ev.platform.id}`
              : `/evaluate/${ev.id}`
            const isCefr = a.evaluatorType === 'CEFR'
            const isToolType = a.evaluatorType === 'PEDAGOGY' || a.evaluatorType === 'TECHNICAL' || a.evaluatorType === 'BOTH'
            const gapCount = gapCounts[ev.id] ?? 0
            return (
              <div key={a.id} className="flex items-center group hover:bg-emerald-900/[0.025] transition-colors">
                <Link
                  href={href}
                  className="flex flex-1 items-center gap-4 px-5 py-4 min-w-0"
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
                  {isCefr ? (
                    <StatusChip tone={ev.platform.cefrEvaluation?.status === 'COMPLETED' ? 'forest' : 'emerald'}>
                      {ev.platform.cefrEvaluation?.status === 'COMPLETED' ? 'Completed' : 'In progress'}
                    </StatusChip>
                  ) : (
                    <EvalStateBadge value={ev.state} />
                  )}
                  <ArrowRightIcon className="size-4 text-stone-300 group-hover:text-emerald-700 transition-colors shrink-0" />
                </Link>
                {isAdmin && isToolType && gapCount > 0 && (
                  <div className="pr-5">
                    <GapBadge
                      evaluationId={ev.id}
                      gapCount={gapCount}
                      evaluation={{ id: ev.id, state: ev.state, platform: ev.platform }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </main>
    </div>
  )
}
