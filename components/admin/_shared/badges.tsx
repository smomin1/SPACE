import * as React from "react"
import { ShieldAlertIcon } from "lucide-react"
import type { EvaluatorType, WeightLevel, EvaluationState, PlatformStatus } from "@prisma/client"
import { cn } from "@/lib/utils"

type Tone = "neutral" | "emerald" | "forest" | "amber" | "hollow"

const DOT_CLS: Record<Tone, string> = {
  neutral: "bg-stone-400",
  emerald: "bg-emerald-600",
  forest:  "bg-emerald-900",
  amber:   "bg-amber-600",
  hollow:  "bg-transparent border border-stone-400",
}

export function StatusChip({
  tone = "neutral",
  mark,
  children,
  className,
}: {
  tone?: Tone
  mark?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-stone-100/80 ring-1 ring-inset ring-stone-200 px-2 h-[22px]",
        "text-[11.5px] font-medium tracking-tight text-emerald-950",
        "dark:bg-emerald-50/5 dark:ring-emerald-50/10 dark:text-emerald-50",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", DOT_CLS[tone])} />
      {mark && (
        <span className="font-mono text-[9.5px] tracking-wider text-emerald-950/55 -ml-0.5 dark:text-emerald-50/60">
          {mark}
        </span>
      )}
      {children}
    </span>
  )
}

const TYPE_META: Record<EvaluatorType, { tone: Tone; mark: string; label: string }> = {
  COMPLIANCE: { tone: "neutral", mark: "C", label: "Compliance" },
  PEDAGOGY:   { tone: "emerald", mark: "P", label: "Pedagogy"   },
  TECHNICAL:  { tone: "forest",  mark: "T", label: "Technical"  },
}

export function TypeBadge({ value }: { value: EvaluatorType }) {
  const m = TYPE_META[value]
  if (!m) return null
  return <StatusChip tone={m.tone} mark={m.mark}>{m.label}</StatusChip>
}

export function WeightTier({ value }: { value: WeightLevel }) {
  const level = ({ HIGH: 3, MEDIUM: 2, LOW: 1 } as Record<WeightLevel, number>)[value] ?? 0
  const label = ({ HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as Record<WeightLevel, string>)[value]
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] tabular-nums text-emerald-950/85 dark:text-emerald-50/80">
      <span className="inline-flex gap-[2px]" aria-label={`Weight ${label}`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "block w-[3px] h-3 rounded-sm",
              i < level ? "bg-emerald-800 dark:bg-emerald-400" : "bg-stone-300/80 dark:bg-emerald-50/15",
            )}
          />
        ))}
      </span>
      <span>{label}</span>
    </span>
  )
}

const EVAL_STATE_META: Record<EvaluationState, { tone: Tone; label: string }> = {
  IN_PROGRESS: { tone: "emerald", label: "In progress" },
  MERGED:      { tone: "amber",   label: "Merged"      },
  FINALISED:   { tone: "forest",  label: "Finalised"   },
}

export function EvalStateBadge({ value }: { value: EvaluationState | null }) {
  if (!value) return <StatusChip tone="hollow">None</StatusChip>
  const m = EVAL_STATE_META[value]
  return <StatusChip tone={m.tone}>{m.label}</StatusChip>
}

export function PlatformStatusDot({ value }: { value: PlatformStatus }) {
  if (value === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-800 dark:text-emerald-300">
        <span className="relative flex size-2">
          <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
        </span>
        Active
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-stone-500">
      <span className="size-2 rounded-full bg-stone-400" />
      Inactive
    </span>
  )
}

export function ComplianceGateBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 ring-1 ring-inset ring-amber-700/30 text-amber-900 px-1.5 h-[22px] text-[11px] font-semibold uppercase tracking-wider dark:bg-amber-900/20 dark:ring-amber-400/30 dark:text-amber-200">
      <ShieldAlertIcon className="size-3" />
      Gate
    </span>
  )
}
