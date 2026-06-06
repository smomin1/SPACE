import type { SearchParams } from "next/dist/server/request/search-params";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VitalParamSelect } from "@/components/vital/VitalParamSelect";
import { PILLAR_LABELS, type PillarKey } from "@/lib/vital/constants";

function ToolCard({ heading, text }: { heading: string; text: string | null | undefined }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
          {heading}
        </p>
        <CardTitle className="text-[16px] leading-snug text-emerald-950">
          {text && text.trim() ? text : "None"}
        </CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  );
}

export default async function VitalRecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [stages, levels] = await Promise.all([
    prisma.vitalStage.findMany({ orderBy: { order: "asc" } }),
    prisma.vitalLevel.findMany({
      where: { assessmentOnly: false },
      orderBy: { order: "asc" },
    }),
  ]);

  const stageParam = typeof params.stage === "string" ? params.stage : "";
  const levelParam = typeof params.level === "string" ? params.level : "";

  const stage = stages.find((s) => s.key === stageParam) ?? stages[0];
  const level = levels.find((l) => l.code === levelParam) ?? levels[0];

  const rec =
    stage && level
      ? await prisma.vitalStageRecommendation.findUnique({
          where: { stageId_levelId: { stageId: stage.id, levelId: level.id } },
        })
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <VitalParamSelect
          param="stage"
          placeholder="Stage"
          options={stages.map((s) => ({ value: s.key, label: s.key }))}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-[20px] text-emerald-950">
              {stage?.key} · {level?.code}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {stage?.pillars.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200"
                  title={PILLAR_LABELS[p as PillarKey]}
                >
                  {p} — {PILLAR_LABELS[p as PillarKey]}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ToolCard heading="Core tools" text={rec.coreText} />
            <ToolCard heading="Supplementary tools" text={rec.suppText} />
          </div>

          {rec.vitalNote && (
            <div className="rounded-lg border border-stone-200/80 bg-stone-50/60 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
                VITAL note
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
                {rec.vitalNote}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
