import { SparklesIcon } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canDo } from '@/lib/permissions'
import { listActiveRequirementSets } from '@/lib/requirement-sets'
import { PageHeader } from '@/components/shared/PageHeader'
import { ToolScannerSubNav } from '@/components/tool-scanner/ToolScannerSubNav'

export default async function ToolScannerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const isAdmin = session?.user ? canDo(session.user.role, 'manage:screening') : false
  const sets = await listActiveRequirementSets()

  return (
    <div>
      <PageHeader
        icon={SparklesIcon}
        kicker="Layer 1: Tool Scanner"
        title="Exploratory AI evaluation"
      />
      <ToolScannerSubNav isAdmin={isAdmin} sets={sets} />
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  )
}
