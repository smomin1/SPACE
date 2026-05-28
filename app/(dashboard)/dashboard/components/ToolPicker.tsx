import Link from 'next/link'
import { SparklesIcon, ClipboardCheckIcon, ArrowRightIcon } from 'lucide-react'

export function ToolPicker() {
  return (
    <section>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Tool Scanner Layer Card */}
        <Link
          href="/tool-scanner"
          className="group relative flex flex-col rounded-xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all hover:border-emerald-700/40 hover:shadow-md"
        >
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-emerald-900/[0.06] text-emerald-800 ring-1 ring-emerald-900/10">
            <SparklesIcon className="size-5" />
          </div>
          <h3 className="font-serif text-[18px] tracking-tight text-emerald-950">
            Tool Scanner
          </h3>
          <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-emerald-800/70">
            Layer 1: Exploratory
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600">
            Quickly evaluate any platform by name and URL. AI audits public web
            sources and scores against your requirement set automatically.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-800 group-hover:text-emerald-900">
            Open Tool Scanner
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Tool Evaluator Layer Card: Evaluations */}
        <Link
          href="/evaluations"
          className="group relative flex flex-col rounded-xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all hover:border-emerald-700/40 hover:shadow-md"
        >
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-700/20">
            <ClipboardCheckIcon className="size-5" />
          </div>
          <h3 className="font-serif text-[18px] tracking-tight text-emerald-950">
            Tool Evaluator
          </h3>
          <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-amber-800/80">
            Layer 2: Structured Evaluation
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600">
            Run a deep, human-scored evaluation with pedagogy and technical teams
            working independently, then reconciling conflicts.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-800 group-hover:text-emerald-900">
            Open Evaluations
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>
    </section>
  )
}
