import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VerdictBadge, RiskBadge } from "@/components/vital/VitalBadges";
import { TOOL_ROLE_LABEL } from "@/lib/vital/labels";

export default async function VitalToolsPage() {
  const tools = await prisma.vitalTool.findMany({
    orderBy: [{ isAssessmentTool: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-[20px] text-emerald-950">Tool catalogue</h2>
        <p className="text-[13px] text-stone-500">
          Every teaching and assessment tool in the VITAL framework. Select a
          tool to see its full pillar, skill, and level profile.
        </p>
      </div>
      <div className="overflow-auto rounded-lg border border-stone-200/80">
        <Table className="[&_td]:py-3 [&_th]:h-12 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-stone-500 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-stone-50/40">
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">VITAL/10</TableHead>
              <TableHead>Verdict</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>CEFR range</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tools.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium text-emerald-800">
                  <Link href={`/vital/tools/${t.id}`} className="hover:underline">
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell className="text-[12px] text-stone-500">
                  {TOOL_ROLE_LABEL[t.role]}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      t.isAssessmentTool
                        ? "inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600 ring-1 ring-inset ring-stone-200"
                        : "inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/70"
                    }
                  >
                    {t.isAssessmentTool ? "Assessment" : "Teaching"}
                  </span>
                </TableCell>
                <TableCell className="text-center font-medium tabular-nums text-stone-700">
                  {t.vitalScore10 ?? "-"}
                </TableCell>
                <TableCell>
                  <VerdictBadge value={t.verdict} />
                </TableCell>
                <TableCell>
                  <RiskBadge value={t.deFactoRisk} />
                </TableCell>
                <TableCell className="text-[11px] text-stone-500">
                  {t.cefrRangeLabel ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
