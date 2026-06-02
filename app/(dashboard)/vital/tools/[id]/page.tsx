import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CoverageBadge,
  RatingBadge,
  VerdictBadge,
  RiskBadge,
} from "@/components/vital/VitalBadges";
import {
  COVERAGE_MARK,
  SKILL_DEP_FULL,
  TOOL_DEP_LABEL,
  TOOL_ROLE_LABEL,
  PILLAR_FULL,
} from "@/lib/vital/labels";

export default async function VitalToolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tool, skills, levels] = await Promise.all([
    prisma.vitalTool.findUnique({
      where: { id },
      include: {
        pillarRatings: true,
        skillCoverage: true,
        levelMappings: true,
      },
    }),
    prisma.vitalSkill.findMany({ orderBy: { order: "asc" } }),
    prisma.vitalLevel.findMany({
      where: { assessmentOnly: false },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!tool) notFound();

  const ratByPillar = new Map(tool.pillarRatings.map((r) => [r.pillar, r.rating]));
  const covBySkill = new Map(tool.skillCoverage.map((c) => [c.skillId, c]));
  const covByLevel = new Map(tool.levelMappings.map((m) => [m.levelId, m.coverage]));

  return (
    <div className="space-y-6">
      <Link
        href="/vital/tools"
        className="inline-flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-700"
      >
        <ArrowLeftIcon className="size-3.5" /> Catalogue
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-[24px] text-emerald-950">{tool.name}</h2>
          <p className="mt-1 text-[12px] text-stone-500">
            {TOOL_ROLE_LABEL[tool.role]} ·{" "}
            {tool.isAssessmentTool ? "Assessment tool" : "Teaching tool"}
            {tool.cefrRangeLabel ? ` · ${tool.cefrRangeLabel}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VerdictBadge value={tool.verdict} />
          <RiskBadge value={tool.deFactoRisk} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[13px] text-stone-500">VITAL / 10</CardTitle>
          </CardHeader>
          <CardContent className="text-[22px] font-semibold text-emerald-900">
            {tool.vitalScore10 ?? "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[13px] text-stone-500">V2 / 50</CardTitle>
          </CardHeader>
          <CardContent className="text-[22px] font-semibold text-emerald-900">
            {tool.v2Score50 ?? "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[13px] text-stone-500">
              Overall dependency
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[15px] text-stone-700">
            {tool.overallDependency
              ? TOOL_DEP_LABEL[tool.overallDependency]
              : "-"}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <h3 className="text-[13px] font-medium text-stone-600">Pillar ratings</h3>
        <div className="flex flex-wrap gap-3">
          {(["V", "I", "T", "A", "L"] as const).map((p) => {
            const r = ratByPillar.get(p);
            return (
              <div key={p} className="flex items-center gap-2">
                <span className="text-[12px] text-stone-500">
                  {PILLAR_FULL[p]}
                </span>
                {r ? <RatingBadge value={r} /> : <span>-</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] font-medium text-stone-600">Skill coverage</h3>
        <div className="flex flex-wrap gap-3">
          {skills.map((s) => {
            const c = covBySkill.get(s.id);
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-md border border-stone-200/70 px-3 py-1.5"
              >
                <span className="text-[12px] text-stone-600">{s.name}</span>
                {c ? <CoverageBadge value={c.coverage} /> : <span>-</span>}
                {c?.dependency && (
                  <span className="text-[11px] text-stone-400">
                    {SKILL_DEP_FULL[c.dependency]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] font-medium text-stone-600">CEFR level coverage</h3>
        <div className="overflow-auto rounded-lg border border-stone-200/80">
          <table className="min-w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                {levels.map((l) => (
                  <th
                    key={l.id}
                    className={cn(
                      "border-b border-stone-200 bg-stone-50 px-2.5 py-3 text-center font-semibold",
                      l.cefrStatus !== "Standard CEFR"
                        ? "text-amber-600"
                        : "text-stone-500"
                    )}
                  >
                    {l.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {levels.map((l) => {
                  const c = covByLevel.get(l.id);
                  return (
                    <td
                      key={l.id}
                      className={cn(
                        "px-2.5 py-3 text-center",
                        c === "FULL"
                          ? "text-emerald-700"
                          : c === "PARTIAL"
                            ? "text-amber-600"
                            : "text-stone-300"
                      )}
                    >
                      {c ? COVERAGE_MARK[c] : "-"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {tool.notes && (
        <section className="rounded-lg border border-stone-200/80 bg-stone-50/60 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
            Notes
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
            {tool.notes}
          </p>
        </section>
      )}
    </div>
  );
}
