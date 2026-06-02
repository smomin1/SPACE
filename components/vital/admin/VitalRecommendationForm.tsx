"use client";

import * as React from "react";
import type {
  VitalSkill,
  VitalLevel,
  VitalTool,
  VitalRecommendation,
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PILLARS } from "@/lib/vital/constants";
import { deriveRecommendation, type ToolForDerive } from "@/lib/vital/derive";
import { TOOL_DEP_LABEL } from "@/lib/vital/labels";
import { PillarRow, StatusBadge, RiskBadge } from "@/components/vital/VitalBadges";
import { EnumSelect } from "./fields";

type ToolWithChildren = VitalTool & {
  pillarRatings: VitalToolPillarRating[];
  skillCoverage: VitalToolSkillCoverage[];
  levelMappings: VitalToolLevelMapping[];
};
type Rec = VitalRecommendation & { skill: VitalSkill; level: VitalLevel };

function toDerive(t: ToolWithChildren): ToolForDerive {
  return {
    id: t.id,
    name: t.name,
    role: t.role,
    vitalScore10: t.vitalScore10,
    deFactoRisk: t.deFactoRisk,
    overallDependency: t.overallDependency,
    pillarRatings: t.pillarRatings.map((r) => ({ pillar: r.pillar, rating: r.rating })),
    skillCoverage: t.skillCoverage.map((c) => ({ skillId: c.skillId, coverage: c.coverage })),
    levelMappings: t.levelMappings.map((m) => ({ levelId: m.levelId, coverage: m.coverage })),
  };
}

export function VitalRecommendationForm({
  recommendation,
  skills,
  levels,
  tools,
  onClose,
  onSaved,
}: {
  recommendation: Rec | null;
  skills: VitalSkill[];
  levels: VitalLevel[];
  tools: ToolWithChildren[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const r = recommendation;
  const [form, setForm] = React.useState({
    skillId: r?.skillId ?? skills[0]?.id ?? "",
    levelId: r?.levelId ?? levels[0]?.id ?? "",
    coreToolId: r?.coreToolId ?? "",
    suppToolId: r?.suppToolId ?? "",
    coreToolLocked: r?.coreToolLocked ?? false,
    suppToolLocked: r?.suppToolLocked ?? false,
    deploymentNote: r?.deploymentNote ?? "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const derivePool = React.useMemo(() => tools.map(toDerive), [tools]);
  const nameById = React.useMemo(
    () => new Map(tools.map((t) => [t.id, t.name])),
    [tools]
  );

  // Live preview, same pure function the server uses on save.
  const derived = React.useMemo(
    () =>
      deriveRecommendation({
        skillId: form.skillId,
        levelId: form.levelId,
        tools: derivePool,
        coreToolLocked: form.coreToolLocked,
        suppToolLocked: form.suppToolLocked,
        coreToolId: form.coreToolId || null,
        suppToolId: form.suppToolId || null,
      }),
    [form, derivePool]
  );

  const skillOpts = skills.map((s) => ({ value: s.id, label: s.name }));
  const levelOpts = levels.map((l) => ({ value: l.id, label: l.code }));
  const coreOpts = tools
    .filter((t) => t.role === "CORE")
    .map((t) => ({ value: t.id, label: t.name }));
  const suppOpts = tools
    .filter((t) => t.role === "SUPPLEMENTARY")
    .map((t) => ({ value: t.id, label: t.name }));

  async function submit() {
    setSaving(true);
    setError(null);
    const body = {
      skillId: form.skillId,
      levelId: form.levelId,
      // Only meaningful when locked; the server ignores it for auto slots.
      coreToolId: form.coreToolLocked ? form.coreToolId || null : null,
      suppToolId: form.suppToolLocked ? form.suppToolId || null : null,
      coreToolLocked: form.coreToolLocked,
      suppToolLocked: form.suppToolLocked,
      deploymentNote: form.deploymentNote,
    };
    const res = await fetch(
      r ? `/api/vital/recommendations/${r.id}` : "/api/vital/recommendations",
      {
        method: r ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    setSaving(false);
    if (res.ok) onSaved();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Save failed");
    }
  }

  const pillarPreview = PILLARS.map((p, i) => ({
    key: p,
    coverage: [
      derived.pillarV,
      derived.pillarI,
      derived.pillarT,
      derived.pillarA,
      derived.pillarL,
    ][i],
  }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{r ? "Edit recommendation" : "New recommendation"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <EnumSelect label="Skill" value={form.skillId} onChange={(v) => set("skillId", v)} options={skillOpts} />
          <EnumSelect label="Level" value={form.levelId} onChange={(v) => set("levelId", v)} options={levelOpts} />
        </div>

        {/* Tool pairing, auto-derived unless a slot is locked (override). */}
        <ToolSlot
          title="Core tool"
          locked={form.coreToolLocked}
          onLock={(v) => set("coreToolLocked", v)}
          value={form.coreToolId}
          onChange={(v) => set("coreToolId", v)}
          options={coreOpts}
          autoLabel={derived.coreToolId ? nameById.get(derived.coreToolId) ?? "-" : "None eligible"}
        />
        <ToolSlot
          title="Supplementary tool"
          locked={form.suppToolLocked}
          onLock={(v) => set("suppToolLocked", v)}
          value={form.suppToolId}
          onChange={(v) => set("suppToolId", v)}
          options={suppOpts}
          autoLabel={derived.suppToolId ? nameById.get(derived.suppToolId) ?? "-" : "None eligible"}
        />

        {/* Derived preview, read-only, recomputed from the effective pairing. */}
        <div className="space-y-2 rounded-lg border border-stone-200/80 bg-stone-50/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
            Derived from pairing
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <PillarRow pillars={pillarPreview} />
            <StatusBadge value={derived.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-stone-500">
            <span>
              Core: <RiskInline value={derived.coreRisk} dep={derived.coreDependency} />
            </span>
            <span>
              Supp: <RiskInline value={derived.suppRisk} dep={derived.suppDependency} />
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px]">Deployment note (editorial)</Label>
          <Textarea
            value={form.deploymentNote}
            onChange={(e) => set("deploymentNote", e.target.value)}
            rows={3}
          />
        </div>

        {error && <p className="text-[13px] text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.skillId || !form.levelId}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToolSlot({
  title,
  locked,
  onLock,
  value,
  onChange,
  options,
  autoLabel,
}: {
  title: string;
  locked: boolean;
  onLock: (v: boolean) => void;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  autoLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[12px]">{title}</Label>
        <label className="flex items-center gap-1.5 text-[11px] text-stone-500">
          <Switch checked={locked} onCheckedChange={onLock} />
          Override
        </label>
      </div>
      {locked ? (
        <EnumSelect value={value} onChange={onChange} options={options} allowEmpty placeholder="Pick a tool" />
      ) : (
        <div className="flex h-9 items-center rounded-md border border-dashed border-stone-200 bg-stone-50 px-3 text-[13px] text-stone-600">
          <span className="text-emerald-900">{autoLabel}</span>
          <span className="ml-2 text-[11px] text-stone-400">auto</span>
        </div>
      )}
    </div>
  );
}

function RiskInline({
  value,
  dep,
}: {
  value: Parameters<typeof RiskBadge>[0]["value"];
  dep: keyof typeof TOOL_DEP_LABEL | null;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {value ? <RiskBadge value={value} /> : <span className="text-stone-400">no risk</span>}
      <span className="text-stone-400">·</span>
      <span>{dep ? TOOL_DEP_LABEL[dep] : "-"}</span>
    </span>
  );
}
