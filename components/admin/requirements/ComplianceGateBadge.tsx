import { ShieldAlertIcon } from "lucide-react"

export function ComplianceGateBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/30">
      <ShieldAlertIcon className="size-3" />
      Compliance Gate
    </span>
  )
}
