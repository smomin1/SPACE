import type { SearchParams } from "next/dist/server/request/search-params";
import { prisma } from "@/lib/prisma";

function splitTools(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text.split(/[·•|,]/).map((t) => t.trim()).filter(Boolean);
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VitalParamSelect } from "@/components/vital/VitalParamSelect";

export default async function VitalLevelStackPage({
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

  const levelParam = typeof params.level === "string" ? params.level : "";
  const level = levels.find((l) => l.code === levelParam) ?? levels[0];

  const recs = level
    ? await prisma.vitalStageRecommendation.findMany({ where: { levelId: level.id } })
    : [];

  const byStage = new Map(recs.map((r) => [r.stageId, r]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
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

      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-serif text-[20px] text-emerald-950">
            Level stack · {level?.code}
          </h2>
          <p className="text-[13px] text-stone-500">
            The full nine-stage teaching stack for one CEFR level, with the core
            and supplementary tools and VITAL note for each period stage.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-stone-200/80">
          <Table className="[&_td]:py-3 [&_td]:align-top [&_th]:h-12 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-stone-500 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-stone-50/40">
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Pillars</TableHead>
                <TableHead>Core</TableHead>
                <TableHead>Supplementary</TableHead>
                <TableHead>VITAL note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((s) => {
                const r = byStage.get(s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-stone-700">{s.key}</TableCell>
                    <TableCell className="text-[12px] text-stone-500">
                      {s.pillars.join("+")}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="flex flex-wrap gap-1">
                        {splitTools(r?.coreText).map((t) => (
                          <span key={t} className="inline-flex items-center rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[12px] font-medium text-stone-700">
                            {t}
                          </span>
                        ))}
                        {!r?.coreText && <span className="text-stone-300">-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="flex flex-wrap gap-1">
                        {splitTools(r?.suppText).map((t) => (
                          <span key={t} className="inline-flex items-center rounded-md border border-stone-100 bg-stone-50 px-2 py-0.5 text-[12px] italic text-stone-500">
                            {t}
                          </span>
                        ))}
                        {!r?.suppText && <span className="text-stone-300">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[320px] whitespace-normal break-words text-[12px] leading-relaxed text-stone-500">
                        {r?.vitalNote ?? "-"}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
