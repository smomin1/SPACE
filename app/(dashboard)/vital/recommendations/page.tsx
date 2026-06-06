import type { SearchParams } from "next/dist/server/request/search-params";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VitalParamSelect } from "@/components/vital/VitalParamSelect";
import { PILLAR_LABELS, type PillarKey } from "@/lib/vital/constants";

// Split "Starfall · ICT Games · Seesaw (photo of work)" into structured entries.
// Each entry has a `name` and an optional parenthetical `qualifier`.
interface ToolEntry { name: string; qualifier: string | null }

function parseTools(text: string | null | undefined): ToolEntry[] {
  if (!text?.trim()) return [];
  return text
    .split(/[·•]/)
    .map((raw) => {
      const t = raw.trim();
      const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      return m
        ? { name: m[1].trim(), qualifier: m[2].trim() }
        : { name: t, qualifier: null };
    })
    .filter((e) => e.name);
}

function ToolChip({ entry }: { entry: ToolEntry }) {
  return (
    <span className="inline-flex flex-col rounded-md border border-stone-200 bg-white px-2.5 py-1.5 shadow-sm">
      <span className="text-[12.5px] font-medium text-stone-700">{entry.name}</span>
      {entry.qualifier && (
        <span className="text-[11px] text-stone-400">{entry.qualifier}</span>
      )}
    </span>
  );
}

function ToolCard({
  heading,
  hint,
  tools,
}: {
  heading: string;
  hint: string;
  tools: ToolEntry[];
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
          {heading}
        </p>
        <CardTitle className="text-[13px] font-normal text-stone-400">{hint}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {tools.length === 0 ? (
          <span className="text-[13px] text-stone-300">None specified</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tools.map((e) => (
              <ToolChip key={e.name} entry={e} />
            ))}
          </div>
        )}
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

  const coreTools = parseTools(rec?.coreText);
  const suppTools = parseTools(rec?.suppText);

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
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-[20px] text-emerald-950">
                {stage?.key} · {level?.code}
              </h2>
              <p className="text-[12px] text-stone-400 mt-0.5">
                Select the tool(s) that best fit your context for this stage and level.
              </p>
            </div>
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

          {/* Tool cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ToolCard
              heading="Core tools"
              hint={coreTools.length > 1 ? "Choose one for this session" : "Recommended for this stage"}
              tools={coreTools}
            />
            <ToolCard
              heading="Supplementary tools"
              hint={suppTools.length > 1 ? "Pair with core as needed" : "Optional support"}
              tools={suppTools}
            />
          </div>

          {/* VITAL note */}
          {rec.vitalNote && (
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-amber-700 mb-1.5">
                VITAL note
              </p>
              <p className="text-[13px] leading-relaxed text-stone-700">
                {rec.vitalNote}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
