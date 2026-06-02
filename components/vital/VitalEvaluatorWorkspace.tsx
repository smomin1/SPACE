"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type {
  VitalTool,
  VitalSkill,
  VitalLevel,
  VitalToolPillarRating,
  VitalToolSkillCoverage,
  VitalToolLevelMapping,
  EvaluationState,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PILLARS } from "@/lib/vital/constants";
import { toast } from "sonner";
import {
  EnumSelect,
  COVERAGE_OPTS,
  DEPENDENCY_OPTS,
  TOOL_DEP_OPTS,
  RISK_OPTS,
  VERDICT_OPTS,
  RATING_OPTS,
  TOOL_ROLE_OPTS,
} from "./admin/fields";

type Tool = VitalTool & {
  pillarRatings: VitalToolPillarRating[];
  skillCoverage: VitalToolSkillCoverage[];
  levelMappings: VitalToolLevelMapping[];
};

function ToggleChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-medium transition-colors",
        selected
          ? "border-emerald-700/40 bg-emerald-900/[0.06] text-emerald-900"
          : "border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-700"
      )}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded border transition-colors",
          selected ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-300 bg-white"
        )}
      >
        {selected && <CheckIcon className="size-3" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-stone-200/80 bg-white p-5">
      <h2 className="text-[13px] font-semibold text-emerald-950">{title}</h2>
      {children}
    </section>
  );
}

export function VitalEvaluatorWorkspace({
  evaluationId,
  platformName,
  state,
  locked,
  hasSubmitted,
  tool,
  skills,
  levels,
}: {
  evaluationId: string;
  platformName: string;
  state: EvaluationState;
  locked: boolean;
  hasSubmitted: boolean;
  tool: Tool | null;
  skills: VitalSkill[];
  levels: VitalLevel[];
}) {
  const router = useRouter();

  const [scalar, setScalar] = React.useState({
    // Default the tool name to the platform so the evaluator rarely edits it.
    name: tool?.name ?? platformName,
    role: tool?.role ?? "CORE",
    v2Score50: tool?.v2Score50?.toString() ?? "",
    verdict: tool?.verdict ?? "",
    deFactoRisk: tool?.deFactoRisk ?? "",
    overallDependency: tool?.overallDependency ?? "",
    cefrRangeLabel: tool?.cefrRangeLabel ?? "",
    adaptiveTesting: tool?.adaptiveTesting ?? "",
    notes: tool?.notes ?? "",
    belowA0: tool?.belowA0 ?? false,
    isAssessmentTool: tool?.isAssessmentTool ?? false,
  });

  const [ratings, setRatings] = React.useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const p of PILLARS) m[p] = "N";
    for (const r of tool?.pillarRatings ?? []) m[r.pillar] = r.rating;
    return m;
  });

  const [coverage, setCoverage] = React.useState<Record<string, { coverage: string; dependency: string }>>(() => {
    const m: Record<string, { coverage: string; dependency: string }> = {};
    for (const s of skills) m[s.id] = { coverage: "NONE", dependency: "" };
    for (const c of tool?.skillCoverage ?? [])
      m[c.skillId] = { coverage: c.coverage, dependency: c.dependency ?? "" };
    return m;
  });

  const [levelCov, setLevelCov] = React.useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const l of levels) m[l.id] = "NONE";
    for (const lm of tool?.levelMappings ?? []) m[lm.levelId] = lm.coverage;
    return m;
  });

  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  function setS<K extends keyof typeof scalar>(k: K, v: (typeof scalar)[K]) {
    setScalar((f) => ({ ...f, [k]: v }));
  }

  const derivedVital10 = scalar.isAssessmentTool
    ? null
    : PILLARS.reduce(
        (sum, p) => sum + (ratings[p] === "Y" ? 2 : ratings[p] === "P" ? 1 : 0),
        0
      );

  async function submit() {
    setSaving(true);
    setError(null);
    const body = {
      ...scalar,
      pillarRatings: PILLARS.map((p) => ({ pillar: p, rating: ratings[p] })),
      skillCoverage: skills.map((s) => ({
        skillId: s.id,
        coverage: coverage[s.id].coverage,
        dependency: coverage[s.id].dependency,
      })),
      levelMappings: levels.map((l) => ({ levelId: l.id, coverage: levelCov[l.id] })),
    };
    const res = await fetch(`/api/vital/evaluations/${evaluationId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.success(
        `Submitted. Recommendation engine reran (${data.recommendationsChanged ?? 0} updated).`
      );
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Submit failed");
    }
  }

  const disabled = saving || locked;

  return (
    <div className="space-y-5">
      {hasSubmitted && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-[13px] text-emerald-800">
          You have submitted this VITAL profile. Editing and resubmitting reruns the recommendation engine.
        </div>
      )}
      {locked && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-[13px] text-stone-600">
          This evaluation is locked. Changes are disabled.
        </div>
      )}

      <Section title="Tool details">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Tool name</Label>
            <Input value={scalar.name} onChange={(e) => setS("name", e.target.value)} />
          </div>
          <EnumSelect label="Role" value={scalar.role} onChange={(v) => setS("role", v as never)} options={TOOL_ROLE_OPTS} />
          <div className="space-y-1.5">
            <Label className="text-[12px]">VITAL / 10</Label>
            <div className="flex h-9 items-center rounded-md border border-stone-200 bg-stone-50 px-3 text-[13px] text-stone-700">
              <span className="font-semibold text-emerald-900">{derivedVital10 ?? "-"}</span>
              <span className="ml-2 text-[11px] text-stone-400">auto from pillars</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">V2 / 50</Label>
            <Input type="number" value={scalar.v2Score50} onChange={(e) => setS("v2Score50", e.target.value)} />
          </div>
          <EnumSelect label="Verdict" value={scalar.verdict} onChange={(v) => setS("verdict", v as never)} options={VERDICT_OPTS} allowEmpty />
          <EnumSelect label="De-facto risk" value={scalar.deFactoRisk} onChange={(v) => setS("deFactoRisk", v as never)} options={RISK_OPTS} allowEmpty />
          <EnumSelect label="Overall dependency" value={scalar.overallDependency} onChange={(v) => setS("overallDependency", v as never)} options={TOOL_DEP_OPTS} allowEmpty />
          <div className="space-y-1.5">
            <Label className="text-[12px]">CEFR range label</Label>
            <Input value={scalar.cefrRangeLabel} onChange={(e) => setS("cefrRangeLabel", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Adaptive testing</Label>
            <Input value={scalar.adaptiveTesting} onChange={(e) => setS("adaptiveTesting", e.target.value)} />
          </div>
          <div className="flex flex-wrap items-end gap-2 pb-1">
            <ToggleChip
              label="Below A0"
              selected={scalar.belowA0}
              onToggle={() => setS("belowA0", !scalar.belowA0)}
            />
            <ToggleChip
              label="Assessment tool"
              selected={scalar.isAssessmentTool}
              onToggle={() => setS("isAssessmentTool", !scalar.isAssessmentTool)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Notes</Label>
          <Textarea value={scalar.notes} onChange={(e) => setS("notes", e.target.value)} rows={2} />
        </div>
      </Section>

      <Section title="Pillar ratings">
        <div className="grid grid-cols-5 gap-2">
          {PILLARS.map((p) => (
            <EnumSelect
              key={p}
              label={p}
              value={ratings[p]}
              onChange={(v) => setRatings((m) => ({ ...m, [p]: v }))}
              options={RATING_OPTS}
            />
          ))}
        </div>
      </Section>

      <Section title="Skill coverage">
        <div className="space-y-2">
          {skills.map((s) => (
            <div key={s.id} className="grid grid-cols-3 items-center gap-2">
              <span className="text-[13px] text-stone-600">{s.name}</span>
              <EnumSelect
                value={coverage[s.id].coverage}
                onChange={(v) => setCoverage((m) => ({ ...m, [s.id]: { ...m[s.id], coverage: v } }))}
                options={COVERAGE_OPTS}
              />
              <EnumSelect
                value={coverage[s.id].dependency}
                onChange={(v) => setCoverage((m) => ({ ...m, [s.id]: { ...m[s.id], dependency: v } }))}
                options={DEPENDENCY_OPTS}
                allowEmpty
                placeholder="Dependency"
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="CEFR level coverage">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {levels.map((l) => (
            <EnumSelect
              key={l.id}
              label={l.code}
              value={levelCov[l.id]}
              onChange={(v) => setLevelCov((m) => ({ ...m, [l.id]: v }))}
              options={COVERAGE_OPTS}
            />
          ))}
        </div>
      </Section>

      {error && <p className="text-[13px] text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={disabled || !scalar.name.trim()}>
          {saving ? "Submitting…" : hasSubmitted ? "Resubmit" : "Submit VITAL profile"}
        </Button>
        <span className="text-[12px] text-stone-400">State: {state}</span>
      </div>
    </div>
  );
}
