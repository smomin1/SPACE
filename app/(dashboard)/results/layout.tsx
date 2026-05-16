import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { ResultsNav } from './components/ResultsNav'
import { FilterBar } from './components/FilterBar'
import { ExportButtons } from '@/components/export/ExportButtons'

export default async function ResultsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'view:results')) redirect('/dashboard')

  const [contexts, platforms, categoryRows] = await Promise.all([
    prisma.context.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.platform.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, status: true },
    }),
    prisma.requirement.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    }),
  ])

  const categories = categoryRows.map((r) => r.category!)

  return (
    <div className="flex flex-col">
      {/* Sticky header - title + tab nav + filter bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200/80 shadow-sm">
        <div className="container mx-auto max-w-7xl px-6">
          {/* Title row */}
          <div className="pt-5 pb-3 flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-emerald-950">
              Results
            </h1>
            <span className="text-sm text-stone-400 flex-1">
              Analytics across all evaluated platforms
            </span>
            <ExportButtons />
          </div>

          {/* Tab navigation */}
          <ResultsNav />
        </div>

        {/* Filter bar - full-width strip below tabs */}
        <div className="border-t border-stone-100 bg-stone-50/70">
          <div className="container mx-auto max-w-7xl px-6 py-2.5">
            <Suspense fallback={<FilterBarSkeleton />}>
              <FilterBar
                contexts={contexts}
                platforms={platforms}
                categories={categories}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="container mx-auto max-w-7xl px-6 py-8">
        {children}
      </div>
    </div>
  )
}

function FilterBarSkeleton() {
  return (
    <div className="flex items-center gap-3 h-8">
      {[140, 120, 110, 130, 120, 125].map((w, i) => (
        <div
          key={i}
          className="h-8 rounded-lg bg-stone-200/70 animate-pulse"
          style={{ width: w }}
        />
      ))}
    </div>
  )
}
