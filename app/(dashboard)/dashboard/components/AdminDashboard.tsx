import Link from 'next/link'
import {
  MonitorIcon,
  ClipboardCheckIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  MessageSquareIcon,
  CheckIcon,
  PlusIcon,
  BarChart2Icon,
  InboxIcon,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { cn, relativeTime } from '@/lib/utils'
import { StatCard } from './StatCard'
import { ToolPicker } from './ToolPicker'
import { EvalStateBadge } from '@/components/admin/_shared/badges'

function getNow() { return Date.now() }

export async function AdminDashboard() {
  const now = getNow()
  const [stateCounts, activeEvaluations, recentMessages, recentSubmissions, platformCount, pendingAccessRequests] =
    await Promise.all([
      prisma.evaluation.groupBy({
        by: ['state'],
        _count: { id: true },
      }),
      prisma.evaluation.findMany({
        where: { state: { not: 'FINALISED' } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          state: true,
          createdAt: true,
          platform: { select: { id: true, name: true, vendor: true, status: true, track: true } },
          assignments: {
            select: { userId: true, evaluatorType: true, hasSubmitted: true },
          },
          conflictThreads: {
            select: { id: true, isClosed: true },
          },
        },
      }),
      prisma.conflictMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { name: true } },
          thread: {
            select: {
              evaluationId: true,
              evaluation: { select: { platform: { select: { name: true } } } },
            },
          },
        },
      }),
      prisma.evaluatorAssignment.findMany({
        where: { hasSubmitted: true, submittedAt: { not: null } },
        orderBy: { submittedAt: 'desc' },
        take: 20,
        select: {
          submittedAt: true,
          evaluatorType: true,
          user: { select: { name: true } },
          evaluation: { select: { id: true, platform: { select: { name: true, track: true } } } },
        },
      }),
      prisma.platform.count(),
      prisma.accessRequest.count({ where: { status: 'PENDING' } }),
    ])

  const inProgressCount = stateCounts.find(r => r.state === 'IN_PROGRESS')?._count.id ?? 0
  const mergedCount     = stateCounts.find(r => r.state === 'MERGED')?._count.id ?? 0
  const finalisedCount  = stateCounts.find(r => r.state === 'FINALISED')?._count.id ?? 0

  type HealthRow = {
    evaluationId: string
    platformName: string
    vendor: string
    track: string
    state: 'IN_PROGRESS' | 'MERGED' | 'FINALISED'
    pedagogyProgress: { submitted: number; total: number }
    technicalProgress: { submitted: number; total: number }
    openConflicts: number
    ageInDays: number
  }

  const healthRows: HealthRow[] = activeEvaluations
    // Keep Tool Evaluator evaluations only — VITAL has its own profile flow
    .filter(e => (e.platform.track ?? 'TOOL') !== 'VITAL')
    .map(e => {
      const pedagogy  = e.assignments.filter(a => a.evaluatorType === 'PEDAGOGY')
      const technical = e.assignments.filter(a => a.evaluatorType === 'TECHNICAL')
      return {
        evaluationId: e.id,
        platformName: e.platform.name,
        vendor: e.platform.vendor,
        track: e.platform.track ?? 'TOOL',
        state: e.state,
        pedagogyProgress: {
          submitted: pedagogy.filter(a => a.hasSubmitted).length,
          total: pedagogy.length,
        },
        technicalProgress: {
          submitted: technical.filter(a => a.hasSubmitted).length,
          total: technical.length,
        },
        openConflicts: e.conflictThreads.filter(t => !t.isClosed).length,
        ageInDays: Math.floor((now - e.createdAt.getTime()) / 86_400_000),
      }
    })

  const stalledEvaluations = healthRows.filter(
    r => r.state === 'MERGED' && r.openConflicts >= 1,
  )

  type ActivityItem = {
    key: string
    type: 'message' | 'submission'
    at: Date
    label: string
    evalId: string
    track: 'TOOL' | 'VITAL'
  }

  const activityFeed: ActivityItem[] = [
    // Conflict messages are always Tool Evaluator (VITAL has no conflicts)
    ...recentMessages.map(m => ({
      key: `msg-${m.id}`,
      type: 'message' as const,
      at: m.createdAt,
      label: `${m.author.name ?? 'Someone'} posted in ${m.thread.evaluation.platform.name}`,
      evalId: m.thread.evaluationId,
      track: 'TOOL' as const,
    })),
    ...recentSubmissions
      .filter(s => s.submittedAt !== null)
      .map(s => ({
        key: `sub-${s.submittedAt!.toISOString()}-${s.user.name}`,
        type: 'submission' as const,
        at: s.submittedAt!,
        label: `${s.user.name ?? 'Someone'} submitted ${s.evaluatorType === 'VITAL' ? 'VITAL profile' : s.evaluatorType === 'PEDAGOGY' ? 'Pedagogy' : 'Technical'} scores for ${s.evaluation.platform.name}`,
        evalId: s.evaluation.id,
        track: (s.evaluation.platform.track ?? 'TOOL') as 'TOOL' | 'VITAL',
      })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 15)

  return (
    <div className="container mx-auto py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Admin Dashboard</h1>
        <p className="text-sm text-stone-500 mt-0.5">System overview and evaluation health.</p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Platforms"
          value={platformCount}
          icon={MonitorIcon}
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          tone="emerald"
          icon={ClipboardCheckIcon}
        />
        <StatCard
          label="Merged - Pending Review"
          value={mergedCount}
          tone={mergedCount > 0 ? 'amber' : 'default'}
          icon={AlertTriangleIcon}
        />
        <StatCard
          label="Finalised"
          value={finalisedCount}
          tone="default"
          icon={CheckCircle2Icon}
        />
      </div>

      {/* Pending access requests callout */}
      {pendingAccessRequests > 0 && (
        <Link href="/admin/access-requests">
          <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4 hover:bg-amber-50 transition-colors">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 ring-1 ring-amber-200">
              <InboxIcon className="size-4 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {pendingAccessRequests === 1
                  ? '1 pending access request'
                  : `${pendingAccessRequests} pending access requests`}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Review and approve or reject account requests from team members.
              </p>
            </div>
            <span className="shrink-0 flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-400 px-2 text-[12px] font-bold text-emerald-950">
              {pendingAccessRequests > 99 ? '99+' : pendingAccessRequests}
            </span>
          </div>
        </Link>
      )}

      {/* Stalled evaluations callout */}
      {stalledEvaluations.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangleIcon className="size-4 text-amber-600 shrink-0" />
            <h2 className="text-sm font-semibold text-amber-900">
              Stalled Evaluations ({stalledEvaluations.length})
            </h2>
          </div>
          <p className="text-xs text-amber-700 mb-4">
            These MERGED evaluations have open conflict threads blocking finalisation.
          </p>
          <div className="space-y-2">
            {stalledEvaluations.map(e => (
              <Link key={e.evaluationId} href={`/evaluate/${e.evaluationId}`}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-200/80 bg-white hover:bg-amber-50/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-emerald-950 truncate">{e.platformName}</p>
                    <p className="text-xs text-stone-400 truncate">{e.vendor}</p>
                  </div>
                  <EvalStateBadge value={e.state} />
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 ring-1 ring-amber-200 px-2 h-[22px] text-[11.5px] font-medium text-amber-700">
                    {e.openConflicts} open {e.openConflicts === 1 ? 'conflict' : 'conflicts'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Health table + activity feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Evaluation health table */}
        <div className="xl:col-span-2 rounded-xl border border-stone-200/80 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-emerald-950">Evaluation Health</h2>
          </div>
          {healthRows.length === 0 ? (
            <p className="px-5 py-8 text-sm text-stone-400 text-center">No active evaluations.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-stone-100 text-[11px] font-medium uppercase tracking-wider text-stone-400">
                    <th className="px-5 py-3 text-left">Platform</th>
                    <th className="px-3 py-3 text-left">State</th>
                    <th className="px-3 py-3 text-center">Pedagogy</th>
                    <th className="px-3 py-3 text-center">Technical</th>
                    <th className="px-3 py-3 text-center">Conflicts</th>
                    <th className="px-4 py-3 text-right">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {healthRows.map(row => {
                    const pedComplete = row.pedagogyProgress.submitted === row.pedagogyProgress.total && row.pedagogyProgress.total > 0
                    const techComplete = row.technicalProgress.submitted === row.technicalProgress.total && row.technicalProgress.total > 0
                    return (
                      <tr key={row.evaluationId} className="hover:bg-stone-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <Link href={`/evaluate/${row.evaluationId}`} className="hover:text-emerald-800 transition-colors">
                            <p className="font-medium text-emerald-950 truncate max-w-[180px]">{row.platformName}</p>
                            <p className="text-[11px] text-stone-400 truncate max-w-[180px]">{row.vendor}</p>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <EvalStateBadge value={row.state} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={cn(
                            'font-medium tabular-nums',
                            pedComplete ? 'text-emerald-700' : row.pedagogyProgress.total > 0 ? 'text-amber-600' : 'text-stone-400',
                          )}>
                            {row.pedagogyProgress.submitted}/{row.pedagogyProgress.total}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={cn(
                            'font-medium tabular-nums',
                            techComplete ? 'text-emerald-700' : row.technicalProgress.total > 0 ? 'text-amber-600' : 'text-stone-400',
                          )}>
                            {row.technicalProgress.submitted}/{row.technicalProgress.total}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {row.openConflicts > 0 ? (
                            <span className="inline-flex items-center justify-center rounded-md bg-amber-100 ring-1 ring-amber-200 px-2 h-[20px] text-[11.5px] font-medium text-amber-700">
                              {row.openConflicts}
                            </span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-stone-400 tabular-nums">
                          {row.ageInDays}d
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="xl:col-span-1 rounded-xl border border-stone-200/80 bg-white p-5">
          <h2 className="text-sm font-semibold text-emerald-950 mb-4">Recent Activity</h2>
          {activityFeed.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {activityFeed.map(item => (
                <Link key={item.key} href={item.track === 'VITAL' ? `/vital-evaluate/${item.evalId}` : `/evaluate/${item.evalId}`}>
                  <div className="flex items-start gap-3 py-2 rounded-md hover:bg-stone-50 px-2 transition-colors">
                    <div className={cn(
                      'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ring-1',
                      item.type === 'message'
                        ? 'bg-amber-50 ring-amber-200 text-amber-600'
                        : 'bg-emerald-50 ring-emerald-200 text-emerald-700',
                    )}>
                      {item.type === 'message'
                        ? <MessageSquareIcon className="size-3" />
                        : <CheckIcon className="size-3" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-emerald-950 leading-snug">{item.label}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">{relativeTime(item.at)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <ToolPicker />

      {/* Quick actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/platforms/new"
          className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-4 h-9 text-[13px] font-medium text-emerald-950 hover:bg-stone-50 transition-colors"
        >
          <PlusIcon className="size-3.5" />
          Create Platform
        </Link>
        <Link
          href="/results"
          className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-4 h-9 text-[13px] font-medium text-emerald-950 hover:bg-stone-50 transition-colors"
        >
          <BarChart2Icon className="size-3.5" />
          View Results
        </Link>
      </div>

    </div>
  )
}
