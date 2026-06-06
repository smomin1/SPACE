import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

interface ToolEntry { name: string; qualifier: string | null }

function splitTools(text: string | null | undefined): ToolEntry[] {
  if (!text?.trim()) return [];
  return text
    .split(/[·•]/)
    .map((raw) => {
      const t = raw.trim();
      const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      return m ? { name: m[1].trim(), qualifier: m[2].trim() } : { name: t, qualifier: null };
    })
    .filter((e) => e.name);
}

// Short column headers for the 9 period stages.
const STAGE_SHORT: Record<string, string> = {
  "Entry & Warm-Up": "Entry",
  "Core - Vocabulary": "Vocabulary",
  "Core - Listening": "Listening",
  "Core - Speaking": "Speaking",
  "Core - Reading": "Reading",
  "Core - Writing": "Writing",
  "Core - Grammar": "Grammar",
  "Check for Understanding": "Check",
  "Exit & Reflection": "Exit",
};

export default async function VitalGridPage() {
  const [stages, levels, recs] = await Promise.all([
    prisma.vitalStage.findMany({ orderBy: { order: "asc" } }),
    prisma.vitalLevel.findMany({
      where: { assessmentOnly: false },
      orderBy: { order: "asc" },
    }),
    prisma.vitalStageRecommendation.findMany(),
  ]);

  const byCell = new Map(recs.map((r) => [`${r.stageId}:${r.levelId}`, r]));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-[20px] text-emerald-950">
          CEFR × Stage × Tools · 9 stages × 22 levels
        </h2>
        <p className="text-[13px] text-stone-500">
          Recommended core (bold) and supplementary (italic) tools for every
          period stage at every CEFR sub-level. Hover a cell for its VITAL note.
        </p>
      </div>

      <div className="overflow-auto rounded-lg border border-stone-200/80">
        <table className="min-w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Level
              </th>
              {stages.map((s) => (
                <th
                  key={s.id}
                  className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500"
                >
                  <div>{STAGE_SHORT[s.key] ?? s.key}</div>
                  <div className="text-[9px] font-normal text-stone-400">{s.pillars.join("+")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((l) => (
              <tr key={l.id} className="transition-colors hover:bg-stone-50/40">
                <th className="sticky left-0 z-10 border-b border-r border-stone-200 bg-white px-4 py-3 text-left font-semibold text-stone-600">
                  {l.code}
                </th>
                {stages.map((s) => {
                  const r = byCell.get(`${s.id}:${l.id}`);
                  return (
                    <td
                      key={s.id}
                      className="border-b border-stone-100 px-4 py-3 align-top"
                      title={r?.vitalNote ?? undefined}
                    >
                      {r && (r.coreText || r.suppText) ? (
                        <div className="space-y-1.5">
                          {splitTools(r.coreText).map((e) => (
                            <div key={e.name}>
                              <div className="font-medium text-stone-700">{e.name}</div>
                              {e.qualifier && <div className="text-[10.5px] text-stone-400">{e.qualifier}</div>}
                            </div>
                          ))}
                          {splitTools(r.suppText).map((e) => (
                            <div key={e.name}>
                              <div className="italic text-stone-400 text-[11.5px]">{e.name}</div>
                              {e.qualifier && <div className="text-[10px] text-stone-300">{e.qualifier}</div>}
                            </div>
                          ))}
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
