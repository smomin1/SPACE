import type { SearchParams } from "next/dist/server/request/search-params";
import type { VitalCoverage, VitalToolDependency, VitalRisk } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VitalParamSelect } from "@/components/vital/VitalParamSelect";
import {
  StatusBadge,
  RiskBadge,
  PillarCoverage,
} from "@/components/vital/VitalBadges";
import { TOOL_DEP_LABEL } from "@/lib/vital/labels";

function depLabel(d: VitalToolDependency | null | undefined) {
  return d ? TOOL_DEP_LABEL[d] : "-";
}

function ToolCard({
  heading,
  name,
  dependency,
  risk,
}: {
  heading: string;
  name: string | null | undefined;
  dependency: VitalToolDependency | null | undefined;
  risk: VitalRisk | null | undefined;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
          {heading}
        </p>
        <CardTitle className="text-[17px] text-emerald-950">
          {name ?? "None"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2 text-[13px] text-stone-600">
        <span className="text-stone-500">{depLabel(dependency)}</span>
        <RiskBadge value={risk} />
      </CardContent>
    </Card>
  );
}

export default async function VitalRecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [skills, levels] = await Promise.all([
    prisma.vitalSkill.findMany({ orderBy: { order: "asc" } }),
    prisma.vitalLevel.findMany({
      where: { assessmentOnly: false },
      orderBy: { order: "asc" },
    }),
  ]);

  const skillParam = typeof params.skill === "string" ? params.skill : "";
  const levelParam = typeof params.level === "string" ? params.level : "";

  const skill = skills.find((s) => s.name === skillParam) ?? skills[0];
  const level = levels.find((l) => l.code === levelParam) ?? levels[0];

  const rec =
    skill && level
      ? await prisma.vitalRecommendation.findUnique({
          where: { skillId_levelId: { skillId: skill.id, levelId: level.id } },
          include: { coreTool: true, suppTool: true },
        })
      : null;

  const pillars: { key: string; coverage: VitalCoverage }[] = rec
    ? [
        { key: "V", coverage: rec.pillarV },
        { key: "I", coverage: rec.pillarI },
        { key: "T", coverage: rec.pillarT },
        { key: "A", coverage: rec.pillarA },
        { key: "L", coverage: rec.pillarL },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <VitalParamSelect
          param="skill"
          placeholder="Skill"
          options={skills.map((s) => ({ value: s.name, label: s.name }))}
        />
        <VitalParamSelect
          param="level"
          placeholder="CEFR level"
          options={levels.map((l) => ({ value: l.code, label: l.code }))}
        />
        {level && (
          <span className="text-[12px] text-stone-400">
            {level.scoreBand} · {level.cefrStatus}
          </span>
        )}
      </div>

      {!rec ? (
        <p className="text-[13px] text-stone-500">
          No recommendation found for this combination.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-[20px] text-emerald-950">
              {skill?.name} · {level?.code}
            </h2>
            <StatusBadge value={rec.status} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ToolCard
              heading="Core tool"
              name={rec.coreTool?.name}
              dependency={rec.coreDependency}
              risk={rec.coreRisk}
            />
            <ToolCard
              heading="Supplementary tool"
              name={rec.suppTool?.name}
              dependency={rec.suppDependency}
              risk={rec.suppRisk}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
              Combined VITAL coverage
            </p>
            <PillarCoverage pillars={pillars} />
          </div>

          {rec.deploymentNote && (
            <div className="rounded-lg border border-stone-200/80 bg-stone-50/60 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
                Deployment note
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
                {rec.deploymentNote}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
