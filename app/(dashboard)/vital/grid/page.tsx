import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import type { VitalComplianceStatus } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/vital/labels";

const STATUS_DOT: Record<VitalComplianceStatus, string> = {
  COMPLIANT: "bg-emerald-500",
  ONE_GAP: "bg-amber-500",
  MULTI_GAP: "bg-red-500",
};

export default async function VitalGridPage() {
  const [skills, levels, recs] = await Promise.all([
    prisma.vitalSkill.findMany({ orderBy: { order: "asc" } }),
    prisma.vitalLevel.findMany({
      where: { assessmentOnly: false },
      orderBy: { order: "asc" },
    }),
    prisma.vitalRecommendation.findMany({
      include: { coreTool: true, suppTool: true },
    }),
  ]);

  const byCell = new Map(recs.map((r) => [`${r.skillId}:${r.levelId}`, r]));

  function levelTone(_cefrStatus: string, _code: string) {
    return "bg-white text-stone-600";
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-[20px] text-emerald-950">
          Full grid · 6 skills × 22 levels
        </h2>
        <p className="text-[13px] text-stone-500">
          Recommended core (bold) and supplementary (italic) tool for every
          skill at every CEFR sub-level.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-stone-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Compliant
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-amber-500" /> 1 gap
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-red-500" /> 2+ gaps
        </span>
      </div>

      <div className="overflow-auto rounded-lg border border-stone-200/80">
        <table className="min-w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Level
              </th>
              {skills.map((s) => (
                <th
                  key={s.id}
                  className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500"
                >
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((l) => (
              <tr key={l.id} className="transition-colors hover:bg-stone-50/40">
                <th
                  className={cn(
                    "sticky left-0 z-10 border-b border-r border-stone-200 px-4 py-3 text-left font-semibold",
                    levelTone(l.cefrStatus, l.code)
                  )}
                >
                  {l.code}
                </th>
                {skills.map((s) => {
                  const r = byCell.get(`${s.id}:${l.id}`);
                  return (
                    <td
                      key={s.id}
                      className="border-b border-stone-100 px-4 py-3 align-top"
                    >
                      {r ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                STATUS_DOT[r.status]
                              )}
                              title={STATUS_LABEL[r.status]}
                              aria-hidden
                            />
                            <span className="font-semibold text-stone-700">
                              {r.coreTool?.name ?? "-"}
                            </span>
                          </div>
                          {r.suppTool?.name && (
                            <div className="pl-3 italic text-stone-400">
                              {r.suppTool.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-stone-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
