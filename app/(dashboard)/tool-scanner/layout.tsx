import { SparklesIcon } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ToolScannerSubNav } from '@/components/tool-scanner/ToolScannerSubNav'

export default function ToolScannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader
        icon={SparklesIcon}
        kicker="Layer 1: Tool Scanner"
        title="Exploratory AI evaluation"
      />
      <ToolScannerSubNav />
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  )
}
