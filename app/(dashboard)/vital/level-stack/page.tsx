import type { SearchParams } from "next/dist/server/request/search-params";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VitalParamSelect } from "@/components/vital/VitalParamSelect";
import { StatusBadge, PillarRow } from "@/components/vital/VitalBadges";
import { TOOL_DEP_LABEL } from "@/lib/vital/labels";

export default async function VitalLevelStackPage({
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

  const levelParam = typeof params.level === "string" ? params.level : "";
  const level = levels.find((l) => l.code === levelParam) ?? levels[0];

  const recs = level
    ? await prisma.vitalRecommendation.findMany({
        where: { levelId: level.id },
        include: { coreTool: true, suppTool: true },
      })
    : [];

  const bySkill = new Map(recs.map((r) => [r.skillId, r]));

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
            The full six-skill teaching stack for this CEFR level, with combined
            VITAL coverage and deployment guidance per skill.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-stone-200/80">
          <Table className="[&_td]:py-3 [&_td]:align-top [&_th]:h-12 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-stone-500 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-stone-50/40">
            <TableHeader>
              <TableRow>
                <TableHead>Skill</TableHead>
                <TableHead>Core</TableHead>
                <TableHead>Supplementary</TableHead>
                <TableHead>VITAL coverage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Teacher-design note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((s) => {
                const r = bySkill.get(s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-stone-700">
                      {s.name}
                    </TableCell>
                    <TableCell>
                      {r?.coreTool?.name ?? "-"}
                      {r?.coreDependency && (
                        <span className="ml-1 text-[11px] text-stone-400">
                          ({TOOL_DEP_LABEL[r.coreDependency]})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r?.suppTool?.name ?? "-"}
                      {r?.suppDependency && (
                        <span className="ml-1 text-[11px] text-stone-400">
                          ({TOOL_DEP_LABEL[r.suppDependency]})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r ? (
                        <PillarRow
                          pillars={[
                            { key: "V", coverage: r.pillarV },
                            { key: "I", coverage: r.pillarI },
                            { key: "T", coverage: r.pillarT },
                            { key: "A", coverage: r.pillarA },
                            { key: "L", coverage: r.pillarL },
                          ]}
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {r ? <StatusBadge value={r.status} compact /> : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[320px] whitespace-normal break-words text-[12px] leading-relaxed text-stone-500">
                        {r?.deploymentNote ?? "-"}
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
