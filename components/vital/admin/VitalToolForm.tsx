"use client";

import * as React from "react";
import type {
  VitalTool,
  VitalSkill,
  VitalLevel,
  VitalToolPillarRating,
  VitalToolSkillCoverage,
  VitalToolLevelMapping,
} from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PILLARS } from "@/lib/vital/constants";
import {
  EnumSelect,
  COVERAGE_OPTS,
  DEPENDENCY_OPTS,
  TOOL_DEP_OPTS,
  RISK_OPTS,
  VERDICT_OPTS,
  RATING_OPTS,
  TOOL_ROLE_OPTS,
} from "./fields";

type Tool = VitalTool & {
  pillarRatings: VitalToolPillarRating[];
  skillCoverage: VitalToolSkillCoverage[];
  levelMappings: VitalToolLevelMapping[];
};

export function VitalToolForm({
  tool,
  skills,
  levels,
  onClose,
  onSaved,
}: {
  tool: Tool | null;
  skills: VitalSkill[];
  levels: VitalLevel[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [scalar, setScalar] = React.useState({
    name: tool?.name ?? "",
    role: tool?.role ?? "SUPPLEMENTARY",
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

  // VITAL/10 is derived from pillar ratings (Y=2, P=1, N=0). Assessment tools
  // carry no pillar profile, so their /10 is blank. Server recomputes on save.
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
    const res = await fetch(tool ? `/api/vital/tools/${tool.id}` : "/api/vital/tools", {
      method: tool ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Save failed");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{tool ? "Edit tool" : "New tool"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Name</Label>
            <Input value={scalar.name} onChange={(e) => setS("name", e.target.value)} />
          </div>
          <EnumSelect label="Role" value={scalar.role} onChange={(v) => setS("role", v as never)} options={TOOL_ROLE_OPTS} />
          <div className="space-y-1.5">
            <Label className="text-[12px]">VITAL / 10</Label>
            <div className="flex h-9 items-center rounded-md border border-stone-200 bg-stone-50 px-3 text-[13px] text-stone-700">
              <span className="font-semibold text-emerald-900">
                {derivedVital10 ?? "-"}
              </span>
              <span className="ml-2 text-[11px] text-stone-400">
                auto from pillars
              </span>
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
          <div className="flex items-end gap-4 pb-1">
            <label className="flex items-center gap-2 text-[13px]">
              <Switch checked={scalar.belowA0} onCheckedChange={(v) => setS("belowA0", v)} />
              Below A0
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <Switch checked={scalar.isAssessmentTool} onCheckedChange={(v) => setS("isAssessmentTool", v)} />
              Assessment tool
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px]">Notes</Label>
          <Textarea value={scalar.notes} onChange={(e) => setS("notes", e.target.value)} rows={2} />
        </div>

        <div>
          <Label className="text-[12px]">Pillar ratings</Label>
          <div className="mt-1.5 grid grid-cols-5 gap-2">
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
        </div>

        <div>
          <Label className="text-[12px]">Skill coverage</Label>
          <div className="mt-1.5 space-y-2">
            {skills.map((s) => (
              <div key={s.id} className="grid grid-cols-3 items-center gap-2">
                <span className="text-[13px] text-stone-600">{s.name}</span>
                <EnumSelect
                  value={coverage[s.id].coverage}
                  onChange={(v) =>
                    setCoverage((m) => ({ ...m, [s.id]: { ...m[s.id], coverage: v } }))
                  }
                  options={COVERAGE_OPTS}
                />
                <EnumSelect
                  value={coverage[s.id].dependency}
                  onChange={(v) =>
                    setCoverage((m) => ({ ...m, [s.id]: { ...m[s.id], dependency: v } }))
                  }
                  options={DEPENDENCY_OPTS}
                  allowEmpty
                  placeholder="Dependency"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-[12px]">CEFR level coverage</Label>
          <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
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
        </div>

        {error && <p className="text-[13px] text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !scalar.name.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
