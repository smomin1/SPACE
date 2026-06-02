import Link from 'next/link'
import {
  ClipboardCheckIcon,
  CheckCircle2Icon,
  MessageSquareWarningIcon,
  MessageSquareIcon,
  ClipboardListIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  BellIcon,
} from 'lucide-react'
import type { EvaluatorType, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { relativeTime } from '@/lib/utils'
import { StatCard } from './StatCard'
import { ToolPicker } from './ToolPicker'
import { EvalStateBadge, TypeBadge } from '@/components/admin/_shared/badges'

interface EvaluatorDashboardProps {
  userId: string
  role: Role
}

function getNow() { return Date.now() }

// VITAL-track evaluations use a dedicated profile workspace, not /evaluate.
function hrefFor(track: 'TOOL' | 'VITAL', evaluationId: string) {
  return track === 'VITAL' ? `/vital-evaluate/${evaluationId}` : `/evaluate/${evaluationId}`
}

type NotifItem =
  | {
      type: 'assignment'
      key: string
      at: Date
      platformName: string
      vendor: string
      evaluationId: string
      track: 'TOOL' | 'VITAL'
      evaluatorType: EvaluatorType
      isLead: boolean
    }
  | {
      type: 'message'
      key: string
      at: Date
      platformName: string
      requirementTitle: string
      evaluationId: string
      content: string
    }

export async function EvaluatorDashboard({ userId, role }: EvaluatorDashboardProps) {
  const isVital = role === 'VITAL_EVALUATOR'
  const now = getNow()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

  const myAssignments = await prisma.evaluatorAssignment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      evaluatorType: true,
      hasSubmitted: true,
      isLead: true,
      createdAt: true,
      evaluation: {
        select: {
          id: true,
          state: true,
          platform: { select: { id: true, name: true, vendor: true, track: true } },
          conflictThreads: {
            where: { isClosed: false },
            select: { id: true },
          },
        },
      },
    },
  })

  const myEvaluationIds = myAssignments.map(a => a.evaluation.id)

  const pendingSubmissions = myAssignments.filter(
    a => !a.hasSubmitted && a.evaluation.state === 'IN_PROGRESS',
  )

  const pendingEvalIds = pendingSubmissions.map(a => a.evaluation.id)

  const [openThreadsRaw, reqCounts, scoreCounts] = await Promise.all([
    myEvaluationIds.length > 0
      ? prisma.conflictThread.findMany({
          where: {
            evaluationId: { in: myEvaluationIds },
            isClosed: false,
            messages: { some: {} },
          },
          select: {
            id: true,
            evaluationId: true,
            requirement: { select: { title: true } },
            evaluation: { select: { platform: { select: { name: true } } } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { authorId: true, content: true, createdAt: true },
            },
          },
        })
      : Promise.resolve([]),

    // Total requirements per evaluatorType (for completion %)
    prisma.requirement.groupBy({
      by: ['evaluatorType'],
      _count: { id: true },
    }),

    // Scores already saved by this user for each pending evaluation
    pendingEvalIds.length > 0
      ? prisma.score.groupBy({
          by: ['evaluationId'],
          where: { userId, evaluationId: { in: pendingEvalIds } },
          _count: { id: true },
        })
      : Promise.resolve([]),
  ])

  const mergedAssignments = myAssignments.filter(a => a.evaluation.state === 'MERGED')

  const totalAssigned      = myAssignments.length
  const totalSubmitted     = myAssignments.filter(a => a.hasSubmitted).length
  const totalOpenConflicts = myAssignments.reduce(
    (sum, a) => sum + a.evaluation.conflictThreads.length, 0,
  )

  // Notifications: new assignments + unread messages, both within the last 7 days
  const notifications: NotifItem[] = [
    ...myAssignments
      .filter(a => a.createdAt >= sevenDaysAgo)
      .map(a => ({
        type: 'assignment' as const,
        key: `asgn-${a.id}`,
        at: a.createdAt,
        platformName: a.evaluation.platform.name,
        vendor: a.evaluation.platform.vendor,
        evaluationId: a.evaluation.id,
        track: a.evaluation.platform.track,
        evaluatorType: a.evaluatorType,
        isLead: a.isLead,
      })),
    ...openThreadsRaw
      .filter(
        t =>
          t.messages.length > 0 &&
          t.messages[0].authorId !== userId &&
          t.messages[0].createdAt >= sevenDaysAgo,
      )
      .map(t => ({
        type: 'message' as const,
        key: `msg-${t.id}`,
        at: t.messages[0].createdAt,
        platformName: t.evaluation.platform.name,
        requirementTitle: t.requirement.title,
        evaluationId: t.evaluationId,
        content: t.messages[0].content,
      })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime())

  return (
    <div className="container mx-auto py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Dashboard</h1>
        <p className="text-sm text-stone-500 mt-0.5">Your evaluation workspace at a glance.</p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Assigned" value={totalAssigned} icon={ClipboardCheckIcon} />
        <StatCard
          label="Submitted"
          value={totalSubmitted}
          sub={`of ${totalAssigned}`}
          tone="emerald"
          icon={CheckCircle2Icon}
        />
        <StatCard
          label="Open Conflicts"
          value={totalOpenConflicts}
          tone={totalOpenConflicts > 0 ? 'amber' : 'default'}
          icon={MessageSquareWarningIcon}
        />
      </div>

      {/* Notifications + Awaiting Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Notifications: fixed height, scrollable list */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-5 flex flex-col h-[400px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <h2 className="text-sm font-semibold text-emerald-950">Notifications</h2>
            {notifications.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold w-5 h-5 ring-1 ring-amber-200">
                {notifications.length}
              </span>
            )}
            <span className="ml-auto text-[11px] text-stone-400">Last 7 days</span>
          </div>
          {notifications.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <BellIcon className="size-5 text-stone-300" />
              <p className="text-sm text-stone-400">Nothing new this week.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              {notifications.map(n => (
                <Link
                  key={n.key}
                  href={n.type === 'assignment' ? hrefFor(n.track, n.evaluationId) : `/evaluate/${n.evaluationId}`}
                >
                  {n.type === 'assignment' ? (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-stone-200/80 bg-stone-50/60 hover:bg-stone-50 transition-colors">
                      <ClipboardListIcon className="size-4 text-emerald-700 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[13px] font-medium text-emerald-950 truncate">
                            {n.platformName}
                          </p>
                          {n.isLead && (
                            <span className="inline-flex items-center rounded-md bg-amber-50 ring-1 ring-inset ring-amber-300/60 px-1.5 h-[16px] text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                              Lead
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 truncate">New assignment · {n.vendor}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <TypeBadge value={n.evaluatorType} />
                        <span className="text-[11px] text-stone-400">{relativeTime(n.at)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-200/80 bg-amber-50/60 hover:bg-amber-50 transition-colors">
                      <MessageSquareIcon className="size-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-emerald-950 truncate">
                          {n.platformName}
                        </p>
                        <p className="text-xs text-stone-500 truncate">{n.requirementTitle}</p>
                        <p className="text-[11.5px] text-stone-400 truncate mt-0.5 italic">
                          &ldquo;{n.content.slice(0, 80)}{n.content.length > 80 ? '…' : ''}&rdquo;
                        </p>
                      </div>
                      <span className="text-[11px] text-stone-400 shrink-0 whitespace-nowrap">
                        {relativeTime(n.at)}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Awaiting Submissions: fixed height, scrollable list, with completion % */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-5 flex flex-col h-[400px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <h2 className="text-sm font-semibold text-emerald-950">Awaiting Submissions</h2>
            {pendingSubmissions.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-stone-100 text-stone-600 text-[11px] font-semibold w-5 h-5 ring-1 ring-stone-200">
                {pendingSubmissions.length}
              </span>
            )}
          </div>
          {pendingSubmissions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <CheckCircle2Icon className="size-5 text-emerald-300" />
              <p className="text-sm text-stone-400">All evaluations submitted.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="divide-y divide-stone-100">
                {pendingSubmissions.map(a => {
                  const total  = reqCounts.find(r => r.evaluatorType === a.evaluatorType)?._count.id ?? 0
                  const scored = scoreCounts.find(s => s.evaluationId === a.evaluation.id)?._count.id ?? 0
                  const pct    = total > 0 ? Math.round((scored / total) * 100) : 0

                  return (
                    <Link
                      key={a.id}
                      href={hrefFor(a.evaluation.platform.track, a.evaluation.id)}
                      className="flex items-center gap-3 py-3 hover:bg-stone-50 -mx-1 px-1 rounded-md transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[13px] font-medium text-emerald-950 truncate">
                            {a.evaluation.platform.name}
                          </p>
                          {a.isLead && (
                            <span className="inline-flex items-center rounded-md bg-amber-50 ring-1 ring-inset ring-amber-300/60 px-1.5 h-[16px] text-[10px] font-semibold text-amber-700 uppercase tracking-wider shrink-0">
                              Lead
                            </span>
                          )}
                        </div>
                        {a.evaluation.platform.track === 'VITAL' ? (
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            VITAL profile · not yet submitted
                          </p>
                        ) : (
                          <>
                            {/* Progress bar */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[11px] tabular-nums text-stone-400 shrink-0 w-8 text-right">
                                {pct}%
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              {scored} / {total} scored
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <TypeBadge value={a.evaluatorType} />
                        <ClipboardListIcon className="size-4 text-stone-300 group-hover:text-emerald-700 transition-colors" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <ToolPicker variant={isVital ? 'vital' : 'tool'} />

      {/* Conflict resolution needed (MERGED evals) */}
      {mergedAssignments.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangleIcon className="size-4 text-amber-600 shrink-0" />
            <h2 className="text-sm font-semibold text-amber-900">Conflict Resolution Needed</h2>
          </div>
          <p className="text-xs text-amber-700 mb-4">
            These evaluations are merged. All open conflicts must be resolved before they can be finalised.
          </p>
          <div className="space-y-2">
            {mergedAssignments.map(a => {
              const openCount = a.evaluation.conflictThreads.length
              return (
                <Link key={a.id} href={hrefFor(a.evaluation.platform.track, a.evaluation.id)}>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-200/80 bg-white hover:bg-amber-50/40 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-emerald-950 truncate">
                        {a.evaluation.platform.name}
                      </p>
                      <p className="text-xs text-stone-400 truncate">{a.evaluation.platform.vendor}</p>
                    </div>
                    <EvalStateBadge value={a.evaluation.state} />
                    {openCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 ring-1 ring-amber-200 px-2 h-[22px] text-[11.5px] font-medium text-amber-700">
                        <MessageSquareWarningIcon className="size-3" />
                        {openCount} open
                      </span>
                    )}
                    <ArrowRightIcon className="size-4 text-stone-300 group-hover:text-emerald-700 transition-colors shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
