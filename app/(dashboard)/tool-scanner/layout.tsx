import { SparklesIcon } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { ToolScannerSubNav } from '@/components/tool-scanner/ToolScannerSubNav'
import { ContextFilter } from '@/components/tool-scanner/ContextFilter'

export default async function ToolScannerLayout({ children }: { children: React.ReactNode }) {
  const contexts = await prisma.context.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div>
      <header className="border-b border-stone-200/70 bg-white/60 px-6 pb-3 pt-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-emerald-800" />
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-800/80">
              Layer 1: Tool Scanner
            </p>
          </div>
          <h1 className="mt-1 font-serif text-[24px] tracking-tight text-emerald-950">
            Exploratory AI evaluation
          </h1>
        </div>
      </header>
      <ToolScannerSubNav />
      <div className="border-b border-stone-100 bg-stone-50/40">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2.5">
          <ContextFilter contexts={contexts} />
          <p className="text-[11.5px] text-stone-500">
            Filter to a context to apply its weight overrides and scope rankings.
          </p>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  )
}
