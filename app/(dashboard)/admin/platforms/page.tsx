import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MonitorIcon, LanguagesIcon, CompassIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { PlatformsTable } from '@/components/admin/platforms/PlatformsTable'
import { cn } from '@/lib/utils'

export default async function PlatformsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'manage:platform')) redirect('/dashboard')

  const { tab } = await searchParams
  const activeTab = tab === 'vital' ? 'vital' : tab === 'cefr' ? 'cefr' : 'tool'

  const platformSelect = {
    id: true,
    name: true,
    vendor: true,
    track: true,
    licenceType: true,
    trialAvailable: true,
    evaluatorAssignments: {
      select: { id: true, evaluatorType: true },
    },
    evaluations: {
      orderBy: { createdAt: 'desc' as const },
      take: 1,
      select: { id: true, state: true },
    },
    // A linked (non-assessment) VITAL tool counts as a completed VITAL assignment.
    vitalTools: {
      where: { isAssessmentTool: false },
      take: 1,
      select: { id: true, v2Percent: true },
    },
    // The CEFR record lives here, independent of track - a platform that has
    // advanced to VITAL still carries its completed CefrEvaluation.
    cefrEvaluation: { select: { status: true } },
  }

  const [toolPlatforms, vitalPlatforms, cefrPlatforms] = await Promise.all([
    prisma.platform.findMany({
      where: { track: 'TOOL' },
      orderBy: { name: 'asc' },
      select: platformSelect,
    }),
    // VITAL tab is keyed off the VITAL record too (not just track), so a platform
    // that has advanced to the Tool stage keeps showing its completed VITAL here.
    prisma.platform.findMany({
      where: { OR: [{ track: 'VITAL' }, { vitalTools: { some: { isAssessmentTool: false } } }] },
      orderBy: { name: 'asc' },
      select: platformSelect,
    }),
    // CEFR tab is keyed off the CefrEvaluation record (not track), so an advanced
    // platform keeps showing its completed CEFR evaluation here.
    prisma.platform.findMany({
      where: { cefrEvaluation: { isNot: null } },
      orderBy: { name: 'asc' },
      select: platformSelect,
    }),
  ])

  const tabs = [
    { key: 'tool', label: 'Tool Evaluator', count: toolPlatforms.length, icon: MonitorIcon, href: '/admin/platforms' },
    { key: 'vital', label: 'VITAL', count: vitalPlatforms.length, icon: CompassIcon, href: '/admin/platforms?tab=vital' },
    { key: 'cefr', label: 'CEFR Evaluations', count: cefrPlatforms.length, icon: LanguagesIcon, href: '/admin/platforms?tab=cefr' },
  ] as const

  const activeData =
    activeTab === 'vital' ? vitalPlatforms
    : activeTab === 'cefr' ? cefrPlatforms
    : toolPlatforms

  return (
    <div>
      <PageHeader
        icon={MonitorIcon}
        kicker="Catalogue"
        title="Platforms"
        description="Register platforms and manage evaluator assignments."
      />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-5 inline-flex rounded-lg border border-stone-200/80 bg-white p-1">
          {tabs.map((t) => {
            const active = activeTab === t.key
            return (
              <Link
                key={t.key}
                href={t.href}
                className={cn(
                  'rounded-md px-3.5 h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors',
                  active
                    ? 'bg-emerald-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100',
                )}
              >
                <t.icon className="size-3.5" />
                {t.label}
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-semibold',
                    active ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500',
                  )}
                >
                  {t.count}
                </span>
              </Link>
            )
          })}
        </div>

        <PlatformsTable initialData={activeData} activeTab={activeTab} />
      </main>
    </div>
  )
}
