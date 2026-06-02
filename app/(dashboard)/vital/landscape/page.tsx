import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CoverageBadge,
  VerdictBadge,
  RiskBadge,
} from "@/components/vital/VitalBadges";
import { cn } from "@/lib/utils";
import { PILLARS } from "@/lib/vital/constants";
import { SKILL_DEP_LABEL, TOOL_ROLE_LABEL } from "@/lib/vital/labels";

// Compact colour-coded pillar rating (Y / P / N) that keeps the dense landscape
// table legible by avoiding a filled pill in every pillar cell.
const RATING_TEXT: Record<string, string> = {
  Y: "text-emerald-700",
  P: "text-amber-600",
  N: "text-stone-300",
};

export default async function VitalLandscapePage() {
  const [skills, tools] = await Promise.all([
    prisma.vitalSkill.findMany({ orderBy: { order: "asc" } }),
    prisma.vitalTool.findMany({
      where: { isAssessmentTool: false },
      orderBy: [{ vitalScore10: "desc" }, { name: "asc" }],
      include: { pillarRatings: true, skillCoverage: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-[20px] text-emerald-950">
          Tool landscape · skills · dependency · VITAL
        </h2>
        <p className="text-[13px] text-stone-500">
          Per-tool skill coverage and teacher dependency, the five VITAL pillar
          ratings, and headline scores. Ranked by VITAL/10.
        </p>
      </div>

      <div className="overflow-auto rounded-lg border border-stone-200/80">
        <Table className="[&_td]:py-3 [&_th]:h-12 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-stone-500 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-stone-50/40">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-stone-50">Tool</TableHead>
              <TableHead>Role</TableHead>
              {skills.map((s) => (
                <TableHead key={s.id}>{s.name}</TableHead>
              ))}
              {PILLARS.map((p) => (
                <TableHead key={p} className="text-center">
                  {p}
                </TableHead>
              ))}
              <TableHead className="text-center">VITAL/10</TableHead>
              <TableHead className="text-center">V2/50</TableHead>
              <TableHead>Verdict</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tools.map((t) => {
              const cov = new Map(t.skillCoverage.map((c) => [c.skillId, c]));
              const rat = new Map(t.pillarRatings.map((r) => [r.pillar, r.rating]));
              return (
                <TableRow key={t.id}>
                  <TableCell className="sticky left-0 z-10 bg-white font-medium text-stone-700">
                    {t.name}
                  </TableCell>
                  <TableCell className="text-[12px] text-stone-500">
                    {TOOL_ROLE_LABEL[t.role]}
                  </TableCell>
                  {skills.map((s) => {
                    const c = cov.get(s.id);
                    return (
                      <TableCell key={s.id}>
                        {c ? (
                          <div className="flex flex-col gap-1">
                            <CoverageBadge value={c.coverage} />
                            {c.dependency && (
                              <span className="text-[10px] text-stone-400">
                                {SKILL_DEP_LABEL[c.dependency]}
                              </span>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    );
                  })}
                  {PILLARS.map((p) => {
                    const r = rat.get(p);
                    return (
                      <TableCell key={p} className="text-center">
                        {r ? (
                          <span
                            className={cn(
                              "text-[12px] font-semibold tabular-nums",
                              RATING_TEXT[r] ?? "text-stone-400"
                            )}
                          >
                            {r}
                          </span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-medium tabular-nums text-stone-700">
                    {t.vitalScore10 ?? "-"}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-stone-500">
                    {t.v2Score50 ?? "-"}
                  </TableCell>
                  <TableCell>
                    <VerdictBadge value={t.verdict} />
                  </TableCell>
                  <TableCell>
                    <RiskBadge value={t.deFactoRisk} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
