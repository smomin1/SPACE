import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { COVERAGE_MARK } from "@/lib/vital/labels";

export default async function VitalAssessmentPage() {
  const [skills, levels, tools] = await Promise.all([
    prisma.vitalSkill.findMany({ orderBy: { order: "asc" } }),
    prisma.vitalLevel.findMany({ orderBy: { order: "asc" } }),
    prisma.vitalTool.findMany({
      where: { isAssessmentTool: true },
      orderBy: { name: "asc" },
      include: { skillCoverage: true, levelMappings: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-[20px] text-emerald-950">
          Assessment landscape
        </h2>
        <p className="text-[13px] text-stone-500">
          Placement and assessment tools with adaptive testing, skill coverage,
          and reach across the CEFR sub-level scale.
        </p>
      </div>

      {/* Key */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-stone-500">
        <span className="font-semibold uppercase tracking-wide text-stone-400">Key</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="font-semibold text-emerald-600">✓</span> Full coverage
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="font-semibold text-amber-500">~</span> Partial coverage
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-stone-300">-</span> Not covered
        </span>
      </div>

      <div className="overflow-auto rounded-lg border border-stone-200/80">
        <table className="min-w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Tool
              </th>
              <th className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Adaptive
              </th>
              {skills.map((s) => (
                <th
                  key={s.id}
                  className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50 px-2.5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-stone-500"
                >
                  {s.name.slice(0, 4)}
                </th>
              ))}
              {levels.map((l) => (
                <th
                  key={l.id}
                  className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50 px-2.5 py-3 text-center font-semibold text-stone-500"
                >
                  {l.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tools.map((t) => {
              const sc = new Map(t.skillCoverage.map((c) => [c.skillId, c.coverage]));
              const lc = new Map(t.levelMappings.map((m) => [m.levelId, m.coverage]));
              return (
                <tr key={t.id} className="odd:bg-white even:bg-stone-50/60 transition-colors hover:bg-emerald-50/30">
                  <th className="sticky left-0 z-10 border-b border-r border-stone-200 bg-inherit px-4 py-3 text-left font-medium text-stone-700">
                    {t.name}
                  </th>
                  <td className="border-b border-stone-100 px-4 py-3 text-[11px] text-stone-500">
                    {t.adaptiveTesting ?? "-"}
                  </td>
                  {skills.map((s) => {
                    const c = sc.get(s.id);
                    return (
                      <td
                        key={s.id}
                        className={cn(
                          "border-b border-stone-100 px-2.5 py-3 text-center",
                          c === "FULL"
                            ? "bg-emerald-50/70 text-emerald-700"
                            : c === "PARTIAL"
                              ? "bg-amber-50/70 text-amber-600"
                              : "text-stone-300"
                        )}
                      >
                        {c ? COVERAGE_MARK[c] : "-"}
                      </td>
                    );
                  })}
                  {levels.map((l) => {
                    const c = lc.get(l.id);
                    return (
                      <td
                        key={l.id}
                        className={cn(
                          "border-b border-stone-100 px-2.5 py-3 text-center",
                          c === "FULL"
                            ? "bg-emerald-50/70 text-emerald-700"
                            : c === "PARTIAL"
                              ? "bg-amber-50/70 text-amber-600"
                              : "text-stone-300"
                        )}
                      >
                        {c ? COVERAGE_MARK[c] : "-"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
