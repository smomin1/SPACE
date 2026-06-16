import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LanguagesIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-700/30' },
  DRAFT: { label: 'Draft', cls: 'bg-amber-50 text-amber-800 ring-amber-700/30' },
  NONE: { label: 'Not started', cls: 'bg-stone-100 text-stone-600 ring-stone-300' },
}

export default async function CefrOverviewPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!canDo(session.user.role, 'view:cefr')) redirect('/dashboard')

  const canEvaluate = canDo(session.user.role, 'submit:cefr_score')

  const platforms = await prisma.platform.findMany({
    where: { status: { not: 'DISQUALIFIED' } },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      vendor: true,
      cefrEvaluation: { select: { status: true, alignmentPct: true, updatedAt: true } },
    },
  })

  return (
    <div>
      <PageHeader icon={LanguagesIcon} kicker="Pedagogy Stage" title="CEFR Evaluation" />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <p className="mb-4 text-[13px] text-stone-500">
          CEFR language-proficiency alignment across the 22 micro-levels and six skills. A
          platform is scored against the 22-point human rubric; alignment excludes N/A answers.
        </p>

        <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-stone-50/60">
                <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Platform</th>
                <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Vendor</th>
                <th className="px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Status</th>
                <th className="px-3 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Alignment</th>
                <th className="px-3 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.1em] text-emerald-950/55">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60">
              {platforms.map((p) => {
                const status = p.cefrEvaluation?.status ?? 'NONE'
                const meta = STATUS_META[status] ?? STATUS_META.NONE
                return (
                  <tr key={p.id} className="hover:bg-stone-50/40">
                    <td className="px-3 py-2.5 font-medium text-emerald-950">{p.name}</td>
                    <td className="px-3 py-2.5 text-stone-500">{p.vendor}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex h-[22px] items-center rounded-md px-2 text-[11px] font-semibold ring-1 ring-inset ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-emerald-950">
                      {p.cefrEvaluation?.alignmentPct != null ? `${p.cefrEvaluation.alignmentPct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {canEvaluate ? (
                        <Link
                          href={`/cefr-evaluate/${p.id}`}
                          className="text-[12.5px] font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
                        >
                          {status === 'NONE' ? 'Evaluate' : 'Open'}
                        </Link>
                      ) : (
                        <span className="text-[12px] text-stone-400">View only</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {platforms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-[13px] text-stone-500">
                    No platforms yet. Add a platform first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
