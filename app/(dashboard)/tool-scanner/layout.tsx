import { SparklesIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { PageHeader } from '@/components/shared/PageHeader'
import { ToolScannerSubNav } from '@/components/tool-scanner/ToolScannerSubNav'

export default async function ToolScannerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const isAdmin = session?.user ? canDo(session.user.role, 'manage:screening') : false

  return (
    <div>
      <PageHeader
        icon={SparklesIcon}
        kicker="Layer 1: Tool Scanner"
        title="Exploratory AI evaluation"
      />
      <ToolScannerSubNav isAdmin={isAdmin} />
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  )
}
