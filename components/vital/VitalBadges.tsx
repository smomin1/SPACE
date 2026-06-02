import type {
  VitalCoverage,
  VitalComplianceStatus,
  VitalRisk,
  VitalVerdict,
  VitalRating,
} from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  COVERAGE_CLASS,
  COVERAGE_LABEL,
  COVERAGE_MARK,
  STATUS_LABEL,
  RISK_CLASS,
  RISK_LABEL,
  VERDICT_CLASS,
  VERDICT_LABEL,
  RATING_CLASS,
  RATING_LABEL,
  PILLAR_FULL,
} from "@/lib/vital/labels";

const STATUS_DOT: Record<VitalComplianceStatus, string> = {
  COMPLIANT: "bg-emerald-500",
  ONE_GAP: "bg-amber-500",
  MULTI_GAP: "bg-red-500",
};

const COVERAGE_DOT: Record<VitalCoverage, string> = {
  FULL: "bg-emerald-500",
  PARTIAL: "bg-amber-500",
  NONE: "bg-stone-300",
  NA: "bg-stone-200",
};

function Pill({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

export function CoverageBadge({ value }: { value: VitalCoverage }) {
  return <Pill className={COVERAGE_CLASS[value]}>{COVERAGE_LABEL[value]}</Pill>;
}

export function StatusBadge({
  value,
  compact = false,
}: {
  value: VitalComplianceStatus;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-stone-600 whitespace-nowrap">
        <span className={cn("size-1.5 rounded-full", STATUS_DOT[value])} aria-hidden />
        {STATUS_LABEL[value]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[12px] font-medium text-stone-700 whitespace-nowrap">
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[value])} aria-hidden />
      {STATUS_LABEL[value]}
    </span>
  );
}

export function RiskBadge({ value }: { value: VitalRisk | null | undefined }) {
  if (!value) return null;
  return <Pill className={RISK_CLASS[value]}>{RISK_LABEL[value]} risk</Pill>;
}

export function VerdictBadge({ value }: { value: VitalVerdict | null | undefined }) {
  if (!value) return null;
  return <Pill className={VERDICT_CLASS[value]}>{VERDICT_LABEL[value]}</Pill>;
}

export function RatingBadge({ value }: { value: VitalRating }) {
  return <Pill className={RATING_CLASS[value]}>{RATING_LABEL[value]}</Pill>;
}

// Readable named-pillar coverage panel for the recommendation detail view.
export function PillarCoverage({
  pillars,
}: {
  pillars: { key: string; coverage: VitalCoverage }[];
}) {
  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-stone-200/80 bg-stone-200/60 sm:grid-cols-5">
      {pillars.map((p) => (
        <div key={p.key} className="flex flex-col gap-2 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-serif text-[15px] leading-none text-emerald-900">
              {p.key}
            </span>
            <span className="text-[11px] leading-tight text-stone-500">
              {PILLAR_FULL[p.key]}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-stone-700">
            <span className={cn("size-2 rounded-full", COVERAGE_DOT[p.coverage])} aria-hidden />
            {COVERAGE_LABEL[p.coverage]}
          </span>
        </div>
      ))}
    </div>
  );
}

// Compact V/I/T/A/L coverage row used in the dense level-stack table. Single
// line, one chip per pillar (letter + coverage mark), full label on hover.
export function PillarRow({
  pillars,
}: {
  pillars: { key: string; coverage: VitalCoverage }[];
}) {
  return (
    <div className="flex flex-nowrap gap-1">
      {pillars.map((p) => (
        <span
          key={p.key}
          title={`${PILLAR_FULL[p.key]}: ${COVERAGE_LABEL[p.coverage]}`}
          className={cn(
            "inline-flex min-w-[30px] items-center justify-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
            COVERAGE_CLASS[p.coverage]
          )}
        >
          {p.key}
          <span className="font-normal opacity-70">{COVERAGE_MARK[p.coverage]}</span>
        </span>
      ))}
    </div>
  );
}
