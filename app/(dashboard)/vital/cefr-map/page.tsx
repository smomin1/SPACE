import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { COVERAGE_MARK, TOOL_ROLE_LABEL } from "@/lib/vital/labels";

export default async function VitalCefrMapPage() {
  const [levels, tools] = await Promise.all([
    prisma.vitalLevel.findMany({
      where: { assessmentOnly: false },
      orderBy: { order: "asc" },
    }),
    prisma.vitalTool.findMany({
      where: { isAssessmentTool: false },
      orderBy: { name: "asc" },
      include: { levelMappings: true },
    }),
  ]);

  const levelById = new Map(levels.map((l) => [l.id, l]));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-[20px] text-emerald-950">
          21-point CEFR mapping
        </h2>
        <p className="text-[13px] text-stone-500">
          Where each teaching tool provides coverage across the full CEFR
          sub-level scale. Highlighted columns are school-defined (non-CEFR) bands.
        </p>
      </div>

      <div className="overflow-auto rounded-lg border border-stone-200/80">
        <table className="min-w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Tool
              </th>
              <th className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Role
              </th>
              <th className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                &lt;A0
              </th>
              {levels.map((l) => (
                <th
                  key={l.id}
                  className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50 px-2.5 py-3 text-center font-semibold text-stone-500"
                >
                  {l.code}
                </th>
              ))}
              <th className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                CEFR range
              </th>
            </tr>
          </thead>
          <tbody>
            {tools.map((t) => {
              const cov = new Map(
                t.levelMappings.map((m) => [m.levelId, m.coverage])
              );
              return (
                <tr key={t.id} className="transition-colors hover:bg-stone-50/40">
                  <th className="sticky left-0 z-10 border-b border-r border-stone-200 bg-white px-4 py-3 text-left font-medium text-stone-700">
                    {t.name}
                  </th>
                  <td className="border-b border-stone-100 px-4 py-3 text-stone-500">
                    {TOOL_ROLE_LABEL[t.role]}
                  </td>
                  <td className="border-b border-stone-100 px-3 py-3 text-center">
                    {t.belowA0 ? "✓" : "-"}
                  </td>
                  {levels.map((l) => {
                    const c = cov.get(l.id);
                    const mark = c ? COVERAGE_MARK[c] : "-";
                    return (
                      <td
                        key={l.id}
                        className={cn(
                          "border-b border-stone-100 px-2.5 py-3 text-center",
                          c === "FULL"
                            ? "text-emerald-700"
                            : c === "PARTIAL"
                              ? "text-amber-600"
                              : "text-stone-300",
                          levelById.get(l.id)?.cefrStatus !== "Standard CEFR" &&
                            "bg-amber-50/40"
                        )}
                      >
                        {mark}
                      </td>
                    );
                  })}
                  <td className="border-b border-stone-100 px-4 py-3 text-[11px] text-stone-500">
                    {t.cefrRangeLabel ?? "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
