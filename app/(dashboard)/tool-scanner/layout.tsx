import { SparklesIcon } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/PageHeader'
import { ToolScannerSubNav } from '@/components/tool-scanner/ToolScannerSubNav'
import { ContextFilter } from '@/components/tool-scanner/ContextFilter'

export default async function ToolScannerLayout({ children }: { children: React.ReactNode }) {
  const contexts = await prisma.context.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div>
      <PageHeader
        icon={SparklesIcon}
        kicker="Layer 1: Tool Scanner"
        title="Exploratory AI evaluation"
      />
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
