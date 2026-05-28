import Link from 'next/link'
import {
  SparklesIcon,
  BarChart2Icon,
  ArrowRightIcon,
  GlobeIcon,
  LayersIcon,
  TableIcon,
  CompassIcon,
  TrendingUpIcon,
  TargetIcon,
  WrenchIcon,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'

export async function ViewerDashboard() {
  const [finalisedCount, platformCount, searchCount, categoryCount] = await Promise.all([
    prisma.evaluation.count({ where: { state: 'FINALISED' } }),
    prisma.platform.count({ where: { status: 'ACTIVE' } }),
    prisma.searchEvaluation.count(),
    prisma.requirement
      .findMany({ where: { category: { not: null } }, distinct: ['category'], select: { category: true } })
      .then((rows) => rows.length),
  ])

  return (
    <div className="container mx-auto max-w-6xl px-6 py-10 space-y-10">
      {/* Welcome header */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-800/70">
          SPACE: Software Platform Analysis, Comparison, and Evaluation
        </p>
        <h1 className="mt-1 font-serif text-[28px] tracking-tight text-emerald-950">
          Welcome to SPACE
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-stone-600">
          As a viewer you have read-only access to the platform evaluation outputs.
          Two areas are available to you: <strong>Tool Scanner</strong> for quick
          AI-driven evaluations, and <strong>Results</strong> for the full
          analytical view across every finalised evaluation.
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock label="Finalised evaluations" value={finalisedCount} />
        <StatBlock label="Active platforms" value={platformCount} />
        <StatBlock label="Tool Scanner runs" value={searchCount} />
        <StatBlock label="Requirement categories" value={categoryCount} />
      </div>

      {/* Tool Scanner explainer */}
      <section className="rounded-2xl border border-stone-200/80 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-900/[0.06] text-emerald-800 ring-1 ring-emerald-900/10">
              <SparklesIcon className="size-6" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-800/70">
                Layer 1: Exploratory
              </p>
              <h2 className="mt-0.5 font-serif text-[22px] tracking-tight text-emerald-950">
                Tool Scanner
              </h2>
            </div>
          </div>
          <Link
            href="/tool-scanner"
            className="group inline-flex items-center gap-1.5 self-start rounded-md bg-emerald-900 px-3.5 h-9 text-[13px] font-medium text-white transition-colors hover:bg-emerald-800"
          >
            Open Tool Scanner
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-stone-700">
          Tool Scanner is an exploratory layer for quickly scoring any educational
          platform, even ones SPACE has never evaluated. You provide a platform
          name and its website URL, and AI audits public sources (vendor
          documentation, app store listings, reviews, demos) to produce a 0 to 4
          score per requirement.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <FeatureRow
            icon={GlobeIcon}
            title="Web-evidence scoring"
            body="AI searches across multiple public sources, not just the vendor's site."
          />
          <FeatureRow
            icon={LayersIcon}
            title="Rankings & matrix"
            body="Compare every Tool Scanner-evaluated platform side by side, by category or overall."
          />
          <FeatureRow
            icon={TableIcon}
            title="Categorical analysis"
            body="See where each platform is strong or weak across requirement categories."
          />
        </div>

        <p className="mt-5 rounded-lg bg-stone-50/70 px-4 py-3 text-[12.5px] leading-relaxed text-stone-600 ring-1 ring-stone-200/60">
          <strong className="font-medium text-emerald-950">When to use it:</strong>{' '}
          shortlisting before a formal review, sanity-checking a vendor's claims, or
          comparing platforms that haven&apos;t yet entered the Tool Evaluator workflow.
        </p>
      </section>

      {/* Results explainer */}
      <section className="rounded-2xl border border-stone-200/80 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-700/20">
              <BarChart2Icon className="size-6" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-amber-800/80">
                Layer 2: Analytics
              </p>
              <h2 className="mt-0.5 font-serif text-[22px] tracking-tight text-emerald-950">
                Results
              </h2>
            </div>
          </div>
          <Link
            href="/results"
            className="group inline-flex items-center gap-1.5 self-start rounded-md bg-emerald-900 px-3.5 h-9 text-[13px] font-medium text-white transition-colors hover:bg-emerald-800"
          >
            Open Results
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-stone-700">
          Results is the analytical view of every formally evaluated platform.
          Pedagogy and Technical teams score each platform independently, conflicts
          are resolved through discussion, and the final outputs flow into the
          dashboards here, filterable by context, category, or platform.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FeatureRow
            icon={CompassIcon}
            title="Comparison"
            body="Weighted scores side by side across all finalised platforms."
          />
          <FeatureRow
            icon={TrendingUpIcon}
            title="Breakdown"
            body="Per-platform category profile and detailed score distribution."
          />
          <FeatureRow
            icon={TargetIcon}
            title="Best Fit"
            body="Recommended platform combinations to cover all requirements."
          />
          <FeatureRow
            icon={WrenchIcon}
            title="Build Readiness"
            body="Technical integration readiness for internal build decisions."
          />
        </div>

        <p className="mt-5 rounded-lg bg-stone-50/70 px-4 py-3 text-[12.5px] leading-relaxed text-stone-600 ring-1 ring-stone-200/60">
          <strong className="font-medium text-emerald-950">When to use it:</strong>{' '}
          procurement decisions, board reporting, or any moment you need
          evidence-backed comparison across the platforms SPACE has fully evaluated.
        </p>
      </section>

      {/* Distinction footnote */}
      <div className="rounded-xl border border-dashed border-stone-300/80 bg-stone-50/40 px-5 py-4">
        <p className="text-[12.5px] leading-relaxed text-stone-600">
          <strong className="font-semibold text-emerald-950">Tool Scanner vs. Results: what&apos;s the difference?</strong>{' '}
          Tool Scanner produces a fast, AI-driven estimate based on what is publicly
          visible online. Results reflects deliberate human evaluation by trained
          pedagogy and technical evaluators: slower, but evidence-backed and
          authoritative. Use Tool Scanner to triage; trust Results for decisions.
        </p>
      </div>
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500">
        {label}
      </p>
      <p className="mt-1 font-serif text-[24px] tabular-nums text-emerald-950">
        {value}
      </p>
    </div>
  )
}

function FeatureRow({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}) {
  return (
    <div className="rounded-lg border border-stone-200/70 bg-stone-50/40 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-emerald-800" />
        <p className="text-[13px] font-medium text-emerald-950">{title}</p>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-stone-600">{body}</p>
    </div>
  )
}
