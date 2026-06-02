// Display labels + tailwind tone classes for VITAL enums. Pure (no server/client
// boundary), so usable from both server pages and client badge components.
import type {
  VitalCoverage,
  VitalComplianceStatus,
  VitalRisk,
  VitalVerdict,
  VitalToolDependency,
  VitalDependency,
  VitalToolRole,
  VitalRating,
} from "@prisma/client";

export const PILLAR_FULL: Record<string, string> = {
  V: "Visible learning",
  I: "Inclusive pedagogy",
  T: "Right technology",
  A: "Assessment for learning",
  L: "Learner agency",
};

export const COVERAGE_LABEL: Record<VitalCoverage, string> = {
  FULL: "Full",
  PARTIAL: "Partial",
  NONE: "None",
  NA: "N/A",
};
export const COVERAGE_MARK: Record<VitalCoverage, string> = {
  FULL: "✓",
  PARTIAL: "~",
  NONE: "-",
  NA: "N/A",
};
export const COVERAGE_CLASS: Record<VitalCoverage, string> = {
  FULL: "bg-emerald-100 text-emerald-800 ring-emerald-300/60",
  PARTIAL: "bg-amber-100 text-amber-800 ring-amber-300/60",
  NONE: "bg-stone-100 text-stone-500 ring-stone-300/50",
  NA: "bg-stone-50 text-stone-400 ring-stone-200/50",
};

export const STATUS_LABEL: Record<VitalComplianceStatus, string> = {
  COMPLIANT: "Compliant",
  ONE_GAP: "1 gap",
  MULTI_GAP: "2+ gaps",
};
export const STATUS_MARK: Record<VitalComplianceStatus, string> = {
  COMPLIANT: "✅",
  ONE_GAP: "⚠",
  MULTI_GAP: "⛔",
};
export const STATUS_CLASS: Record<VitalComplianceStatus, string> = {
  COMPLIANT: "bg-emerald-100 text-emerald-800 ring-emerald-300/60",
  ONE_GAP: "bg-amber-100 text-amber-800 ring-amber-300/60",
  MULTI_GAP: "bg-red-100 text-red-800 ring-red-300/60",
};

export const RISK_LABEL: Record<VitalRisk, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};
export const RISK_CLASS: Record<VitalRisk, string> = {
  LOW: "bg-emerald-100 text-emerald-800 ring-emerald-300/60",
  MEDIUM: "bg-amber-100 text-amber-800 ring-amber-300/60",
  HIGH: "bg-red-100 text-red-800 ring-red-300/60",
};

export const VERDICT_LABEL: Record<VitalVerdict, string> = {
  POOR_FIT: "Poor fit",
  PARTIAL_FIT: "Partial fit",
  GOOD_FIT: "Good fit",
  STRONG_FIT: "Strong fit",
};
export const VERDICT_CLASS: Record<VitalVerdict, string> = {
  POOR_FIT: "bg-red-100 text-red-800 ring-red-300/60",
  PARTIAL_FIT: "bg-amber-100 text-amber-800 ring-amber-300/60",
  GOOD_FIT: "bg-blue-100 text-blue-800 ring-blue-300/60",
  STRONG_FIT: "bg-emerald-100 text-emerald-800 ring-emerald-300/60",
};

export const TOOL_DEP_LABEL: Record<VitalToolDependency, string> = {
  FULLY_TEACHER_LED: "Fully teacher-led",
  MOSTLY_TEACHER_LED: "Mostly teacher-led",
  BLENDED: "Blended",
  MOSTLY_INDEPENDENT: "Mostly independent",
  FULLY_INDEPENDENT: "Fully independent",
};

export const SKILL_DEP_LABEL: Record<VitalDependency, string> = {
  TEACHER_LED: "TL",
  PARTIAL: "P",
  STUDENT: "S",
  NOT_APPLICABLE: "N/A",
};
export const SKILL_DEP_FULL: Record<VitalDependency, string> = {
  TEACHER_LED: "Teacher-led",
  PARTIAL: "Partial",
  STUDENT: "Student",
  NOT_APPLICABLE: "Not applicable",
};

export const TOOL_ROLE_LABEL: Record<VitalToolRole, string> = {
  CORE: "Core",
  SUPPLEMENTARY: "Supplementary",
  RESOURCE_BANK: "Resource bank",
  TEACHER_TOOL: "Teacher tool only",
  ASSESSMENT: "Assessment",
};

export const RATING_LABEL: Record<VitalRating, string> = {
  Y: "Y",
  P: "P",
  N: "N",
};
export const RATING_CLASS: Record<VitalRating, string> = {
  Y: "bg-emerald-100 text-emerald-800 ring-emerald-300/60",
  P: "bg-amber-100 text-amber-800 ring-amber-300/60",
  N: "bg-stone-100 text-stone-500 ring-stone-300/50",
};
