import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { coveragePercent, coverageByCategory, hardFailTriggered } from '@/lib/screening'
import { ScreeningAnswerBadge } from '@/components/tool-scanner/ScreeningAnswerBadge'
import { CategoryChart } from '@/components/tool-scanner/CategoryChart'
import { GlobeIcon, CalendarIcon, AlertTriangleIcon, ExternalLinkIcon, Loader2Icon } from 'lucide-react'

export default async function ToolScannerResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [evaluation, questions] = await Promise.all([
    prisma.searchEvaluation.findUnique({
      where: { id },
      include: { responses: true },
    }),
    prisma.screeningQuestion.findMany({ orderBy: { num: 'asc' } }),
  ])

  if (!evaluation) notFound()

  const metadata = evaluation.metadata as {
    Target_Audience?: string
    Fluency_Levels?: string[]
    Grade_Levels?: string[]
  } | null

  const responseByQuestion = new Map(evaluation.responses.map((r) => [r.questionId, r]))
  const overallPct = coveragePercent(evaluation.responses)
  const categoryPct = coverageByCategory(questions, evaluation.responses)

  const categoryData = Object.entries(categoryPct)
    .map(([category, pct]) => ({ category, pct }))
    .sort((a, b) => b.pct - a.pct)

  // Hard-fail safeguarding blockers: a hard-fail question answered the disqualifying way.
  const hardFailBlockers = questions.filter((q) => {
    const r = responseByQuestion.get(q.id)
    return r ? hardFailTriggered(q.hardFail, r.answer) : false
  })

  // Group questions by category in display order
  const categories = Array.from(new Set(questions.map((q) => q.category)))

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-[24px] tracking-tight text-emerald-950">
              {evaluation.platformName}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] text-stone-500">
              <a
                href={evaluation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-emerald-800"
              >
                <GlobeIcon className="size-3.5" />
                {new URL(evaluation.url).hostname}
              </a>
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                {evaluation.createdAt.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-serif text-[32px] tracking-tight tabular-nums text-emerald-950">
              {overallPct.toFixed(1)}%
            </div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-800/70">
              Coverage
            </p>
          </div>
        </div>

        {metadata && (
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-stone-200/60 pt-4 text-[12.5px]">
            {metadata.Target_Audience && (
              <div>
                <span className="font-medium text-stone-500">Audience:</span>{' '}
                <span className="text-emerald-950">{metadata.Target_Audience}</span>
              </div>
            )}
            {Array.isArray(metadata.Grade_Levels) && metadata.Grade_Levels.length > 0 && (
              <div>
                <span className="font-medium text-stone-500">Grades:</span>{' '}
                <span className="text-emerald-950">{metadata.Grade_Levels.join(', ')}</span>
              </div>
            )}
            {Array.isArray(metadata.Fluency_Levels) && metadata.Fluency_Levels.length > 0 && (
              <div>
                <span className="font-medium text-stone-500">Fluency:</span>{' '}
                <span className="text-emerald-950">{metadata.Fluency_Levels.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {(evaluation.status === 'QUEUED' || evaluation.status === 'SCANNING') && (
        <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50/60 px-4 py-3 ring-1 ring-emerald-700/15">
          <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-emerald-700" />
          <p className="text-[13px] font-medium text-emerald-900">
            {evaluation.status === 'SCANNING'
              ? 'Scan in progress. Results will appear here once it completes.'
              : 'Queued. This scan will start once earlier scans finish.'}
          </p>
        </div>
      )}

      {evaluation.status === 'FAILED' && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-50/70 px-4 py-3 ring-1 ring-red-700/25">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-700" />
          <p className="text-[13px] font-medium text-red-900">
            Scan failed: {evaluation.error ?? 'Unknown error.'}
          </p>
        </div>
      )}

      {hardFailBlockers.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-50/70 px-4 py-3 ring-1 ring-red-700/25">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-700" />
          <div>
            <p className="text-[13px] font-semibold text-red-900">
              Safeguarding blockers ({hardFailBlockers.length})
            </p>
            <p className="mt-0.5 text-[12.5px] text-red-900/85">
              These hard-fail screening questions were answered in a way that disqualifies the
              platform from shortlisting:
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[12.5px] text-red-900/85">
              {hardFailBlockers.map((q) => (
                <li key={q.id}>{q.question}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Category breakdown chart */}
      {categoryData.length > 0 && (
        <div className="rounded-xl border border-stone-200/80 bg-white p-6 shadow-sm">
          <h3 className="mb-1 font-serif text-[18px] tracking-tight text-emerald-950">
            Category coverage
          </h3>
          <p className="mb-4 text-[11.5px] text-stone-500">
            Yes = full, Partial = half, No = none. Unknown answers are excluded.
          </p>
          <CategoryChart data={categoryData} />
        </div>
      )}

      {/* Per-category answers */}
      <div className="space-y-5">
        {categories.map((category) => {
          const catQuestions = questions.filter((q) => q.category === category)
          return (
            <div
              key={category}
              className="overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-sm"
            >
              <div className="flex items-baseline justify-between border-b border-stone-200/60 px-5 py-3">
                <h3 className="font-serif text-[16px] tracking-tight text-emerald-950">
                  {category}
                </h3>
                <span className="font-mono text-[11px] tabular-nums text-stone-500">
                  {(categoryPct[category] ?? 0).toFixed(0)}%
                </span>
              </div>
              <div className="divide-y divide-stone-200/60">
                {catQuestions.map((q) => {
                  const r = responseByQuestion.get(q.id)
                  const answer = r?.answer ?? 'UNKNOWN'
                  const isBlocker = r ? hardFailTriggered(q.hardFail, r.answer) : false
                  return (
                    <div key={q.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-[11px] tabular-nums text-stone-400">
                              {q.num}
                            </span>
                            <span className="text-[13px] text-emerald-950">{q.question}</span>
                            {q.hardFail && (
                              <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-red-700 ring-1 ring-inset ring-red-700/25">
                                Hard fail
                              </span>
                            )}
                          </div>
                          {r?.notes && (
                            <p className="mt-1 pl-[22px] text-[12px] text-stone-500">{r.notes}</p>
                          )}
                          {r?.evidence && (
                            <div className="mt-1 pl-[22px]">
                              {/^https?:\/\//.test(r.evidence) ? (
                                <a
                                  href={r.evidence}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11.5px] text-emerald-700 hover:text-emerald-800 hover:underline"
                                >
                                  <ExternalLinkIcon className="size-3" />
                                  {(() => {
                                    try {
                                      return new URL(r.evidence).hostname
                                    } catch {
                                      return r.evidence
                                    }
                                  })()}
                                </a>
                              ) : (
                                <p className="text-[11.5px] italic text-stone-400">
                                  {r.evidence}
                                </p>
                              )}
                            </div>
                          )}
                          {r?.flag && (
                            <p className="mt-1 pl-[22px] text-[11.5px] text-amber-700">
                              ⚑ {r.flag}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          <ScreeningAnswerBadge value={answer} />
                          {isBlocker && (
                            <p className="mt-1 text-right text-[10px] font-semibold uppercase tracking-wider text-red-700">
                              Blocker
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
