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
  VitalQuestion,
  VitalQuestionResponse,
  VitalAnswer,
  VitalPillar,
  EvaluationState,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PILLARS, PILLAR_LABELS } from "@/lib/vital/constants";
import {
  pillarScore as computePillarScore,
  derivePillarLetter,
  vitalTotals,
  type PillarScore,
} from "@/lib/vital/compute";
import { toast } from "sonner";
import {
  EnumSelect,
  COVERAGE_OPTS,
  DEPENDENCY_OPTS,
  TOOL_DEP_OPTS,
  RISK_OPTS,
  RATING_OPTS,
  TOOL_ROLE_OPTS,
} from "./admin/fields";

type Tool = VitalTool & {
  pillarRatings: VitalToolPillarRating[];
  skillCoverage: VitalToolSkillCoverage[];
  levelMappings: VitalToolLevelMapping[];
  questionResponses: VitalQuestionResponse[];
};

const ANSWER_OPTS: { value: VitalAnswer; label: string }[] = [
  { value: "YES", label: "Yes" },
  { value: "PARTIAL", label: "Partial" },
  { value: "NO", label: "No" },
  { value: "NA", label: "N/A" },
];

// Four-way Yes/Partial/No/N/A selector for one question.
function AnswerToggle({
  value,
  onChange,
  disabled,
}: {
  value: VitalAnswer | undefined;
  onChange: (v: VitalAnswer) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {ANSWER_OPTS.map((o) => {
        const active = value === o.value;
        const tone =
          o.value === "YES"
            ? "border-emerald-600 bg-emerald-600 text-white"
            : o.value === "PARTIAL"
            ? "border-amber-500 bg-amber-500 text-white"
            : o.value === "NO"
            ? "border-rose-500 bg-rose-500 text-white"
            : "border-stone-400 bg-stone-400 text-white";
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-7 min-w-[3rem] rounded-md border px-2 text-[12px] font-medium transition-colors disabled:opacity-50",
              active ? tone : "border-stone-200 bg-white text-stone-500 hover:border-stone-300",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

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
  questions,
}: {
  evaluationId: string;
  platformName: string;
  state: EvaluationState;
  locked: boolean;
  hasSubmitted: boolean;
  tool: Tool | null;
  skills: VitalSkill[];
  levels: VitalLevel[];
  questions: VitalQuestion[];
}) {
  const router = useRouter();

  const [scalar, setScalar] = React.useState({
    // Default the tool name to the platform so the evaluator rarely edits it.
    name: tool?.name ?? platformName,
    role: tool?.role ?? "CORE",
    deFactoRisk: tool?.deFactoRisk ?? "",
    overallDependency: tool?.overallDependency ?? "",
    cefrRangeLabel: tool?.cefrRangeLabel ?? "",
    adaptiveTesting: tool?.adaptiveTesting ?? "",
    notes: tool?.notes ?? "",
    belowA0: tool?.belowA0 ?? false,
    isAssessmentTool: tool?.isAssessmentTool ?? false,
  });

  // The 25 question answers (questionId → answer). Seeded from saved responses.
  const [answers, setAnswers] = React.useState<Record<string, VitalAnswer | undefined>>(() => {
    const m: Record<string, VitalAnswer | undefined> = {};
    for (const r of tool?.questionResponses ?? []) m[r.questionId] = r.answer;
    return m;
  });

  // Optional per-pillar override of the derived letter (pillar → { rating, note }).
  const [overrides, setOverrides] = React.useState<Record<string, { rating: string; note: string }>>(() => {
    const m: Record<string, { rating: string; note: string }> = {};
    for (const r of tool?.pillarRatings ?? []) {
      if (r.isOverride) m[r.pillar] = { rating: r.rating, note: r.overrideNote ?? "" };
    }
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

  // ── Live derivation (mirrors lib/vital/compute.ts) ──────────────────────────
  const questionsByPillar = React.useMemo(() => {
    const m = {} as Record<VitalPillar, VitalQuestion[]>;
    for (const p of PILLARS) m[p] = [];
    for (const q of questions) m[q.pillar]?.push(q);
    return m;
  }, [questions]);

  const pillarScores = React.useMemo(() => {
    const m = {} as Record<VitalPillar, PillarScore>;
    for (const p of PILLARS) {
      const ans = questionsByPillar[p]
        .map((q) => answers[q.id])
        .filter((a): a is VitalAnswer => a != null);
      m[p] = computePillarScore(ans);
    }
    return m;
  }, [questionsByPillar, answers]);

  const totals = React.useMemo(
    () => vitalTotals(PILLARS.map((p) => pillarScores[p])),
    [pillarScores],
  );

  // Effective pillar letter = manual override if present, else derived from /10.
  function effectiveLetter(p: VitalPillar): string {
    return overrides[p]?.rating ?? derivePillarLetter(pillarScores[p].score);
  }

  const answeredCount = questions.filter((q) => answers[q.id] != null).length;
  const allAnswered = answeredCount === questions.length && questions.length > 0;

  async function submit() {
    setSaving(true);
    setError(null);
    const body = {
      ...scalar,
      questionResponses: questions
        .filter((q) => answers[q.id] != null)
        .map((q) => ({ questionId: q.id, answer: answers[q.id] })),
      pillarOverrides: PILLARS.filter((p) => overrides[p]).map((p) => ({
        pillar: p,
        rating: overrides[p].rating,
        note: overrides[p].note || null,
      })),
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
      const created = data.recommendationsCreated ?? 0;
      const changed = data.recommendationsChanged ?? 0;
      toast.success(
        `Submitted. Recommendations refreshed (${changed} updated${created ? `, ${created} added` : ""}).`
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

      {!scalar.isAssessmentTool && (
        <>
          {/* Live score panel */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 sm:grid-cols-7">
            {PILLARS.map((p) => (
              <div key={p} className="text-center">
                <div className="text-[11px] font-medium text-stone-500">{p}</div>
                <div className="text-[15px] font-semibold text-emerald-900">
                  {pillarScores[p].score}
                  <span className="text-[11px] font-normal text-stone-400">/{pillarScores[p].max || 10}</span>
                </div>
                <div className="text-[10px] font-semibold text-stone-400">{effectiveLetter(p)}</div>
              </div>
            ))}
            <div className="text-center">
              <div className="text-[11px] font-medium text-stone-500">VITAL /50</div>
              <div className="text-[15px] font-semibold text-emerald-900">
                {totals.total}
                <span className="text-[11px] font-normal text-stone-400">/{totals.max || 50}</span>
              </div>
              <div className="text-[10px] font-semibold text-stone-400">{totals.percent}%</div>
            </div>
            <div className="text-center">
              <div className="text-[11px] font-medium text-stone-500">Verdict</div>
              <div className="text-[13px] font-semibold text-emerald-900">
                {totals.verdict.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
              </div>
            </div>
          </div>

          {/* 25 questions grouped by pillar */}
          {PILLARS.map((p) => (
            <Section key={p} title={`${p} — ${PILLAR_LABELS[p]}  ·  ${pillarScores[p].score}/${pillarScores[p].max || 10}`}>
              <div className="space-y-3">
                {questionsByPillar[p].map((q) => (
                  <div key={q.id} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="flex-1 text-[13px] leading-snug text-stone-700">{q.text}</p>
                    <AnswerToggle
                      value={answers[q.id]}
                      onChange={(v) => setAnswers((m) => ({ ...m, [q.id]: v }))}
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>

              {/* Override the derived pillar letter */}
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                <span className="text-[11px] text-stone-400">
                  Derived letter: <span className="font-semibold text-stone-600">{derivePillarLetter(pillarScores[p].score)}</span>
                </span>
                {overrides[p] ? (
                  <>
                    <EnumSelect
                      value={overrides[p].rating}
                      onChange={(v) => setOverrides((m) => ({ ...m, [p]: { ...m[p], rating: v } }))}
                      options={RATING_OPTS}
                    />
                    <Input
                      placeholder="Reason for override"
                      value={overrides[p].note}
                      onChange={(e) => setOverrides((m) => ({ ...m, [p]: { ...m[p], note: e.target.value } }))}
                      className="h-8 max-w-xs text-[12px]"
                    />
                    <button
                      type="button"
                      className="text-[12px] text-stone-400 underline hover:text-stone-600"
                      onClick={() => setOverrides((m) => { const n = { ...m }; delete n[p]; return n; })}
                    >
                      Clear override
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    className="text-[12px] text-emerald-700 underline hover:text-emerald-900 disabled:opacity-50"
                    onClick={() =>
                      setOverrides((m) => ({
                        ...m,
                        [p]: { rating: derivePillarLetter(pillarScores[p].score), note: "" },
                      }))
                    }
                  >
                    Override letter
                  </button>
                )}
              </div>
            </Section>
          ))}
        </>
      )}

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
        <Button
          onClick={submit}
          disabled={disabled || !scalar.name.trim() || (!scalar.isAssessmentTool && !allAnswered)}
        >
          {saving ? "Submitting…" : hasSubmitted ? "Resubmit" : "Submit VITAL profile"}
        </Button>
        {!scalar.isAssessmentTool && !allAnswered && (
          <span className="text-[12px] text-amber-600">
            Answer all {questions.length} questions ({answeredCount}/{questions.length})
          </span>
        )}
        <span className="text-[12px] text-stone-400">State: {state}</span>
      </div>
    </div>
  );
}
