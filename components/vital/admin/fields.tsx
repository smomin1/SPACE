"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const NONE = "__none__";

export function EnumSelect({
  label,
  value,
  onChange,
  options,
  allowEmpty,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allowEmpty?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-[12px]">{label}</Label>}
      <Select
        value={value === "" ? NONE : value}
        onValueChange={(v) => onChange(v === NONE ? "" : v)}
      >
        <SelectTrigger size="sm" className="w-full text-[13px]">
          <SelectValue placeholder={placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value={NONE}>None</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export const COVERAGE_OPTS = [
  { value: "FULL", label: "Full" },
  { value: "PARTIAL", label: "Partial" },
  { value: "NONE", label: "None" },
  { value: "NA", label: "N/A" },
];
export const DEPENDENCY_OPTS = [
  { value: "TEACHER_LED", label: "Teacher-led" },
  { value: "PARTIAL", label: "Partial" },
  { value: "STUDENT", label: "Student" },
  { value: "NOT_APPLICABLE", label: "N/A" },
];
export const TOOL_DEP_OPTS = [
  { value: "FULLY_TEACHER_LED", label: "Fully teacher-led" },
  { value: "MOSTLY_TEACHER_LED", label: "Mostly teacher-led" },
  { value: "BLENDED", label: "Blended" },
  { value: "MOSTLY_INDEPENDENT", label: "Mostly independent" },
  { value: "FULLY_INDEPENDENT", label: "Fully independent" },
];
export const RISK_OPTS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];
export const VERDICT_OPTS = [
  { value: "POOR_FIT", label: "Poor fit" },
  { value: "PARTIAL_FIT", label: "Partial fit" },
  { value: "GOOD_FIT", label: "Good fit" },
  { value: "STRONG_FIT", label: "Strong fit" },
];
export const RATING_OPTS = [
  { value: "Y", label: "Y" },
  { value: "P", label: "P" },
  { value: "N", label: "N" },
];
export const TOOL_ROLE_OPTS = [
  { value: "CORE", label: "Core" },
  { value: "SUPPLEMENTARY", label: "Supplementary" },
  { value: "RESOURCE_BANK", label: "Resource bank" },
  { value: "TEACHER_TOOL", label: "Teacher tool only" },
  { value: "ASSESSMENT", label: "Assessment" },
];
export const STATUS_OPTS = [
  { value: "COMPLIANT", label: "Compliant" },
  { value: "ONE_GAP", label: "1 gap" },
  { value: "MULTI_GAP", label: "2+ gaps" },
];
