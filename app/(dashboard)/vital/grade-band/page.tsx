import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function VitalGradeBandPage() {
  const bands = await prisma.vitalGradeBand.findMany({ orderBy: { order: "asc" } });

  // Group by grade band (K-5 / 6-8 / 9-12), preserving order.
  const grouped: { band: string; rows: typeof bands }[] = [];
  for (const b of bands) {
    const last = grouped[grouped.length - 1];
    if (last && last.band === b.band) last.rows.push(b);
    else grouped.push({ band: b.band, rows: [b] });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-[20px] text-emerald-950">
          Grade Band Assignment
        </h2>
        <p className="text-[13px] text-stone-500">
          How school grade bands map to learner levels and CEFR ranges. Grade and
          age relate by <span className="font-medium text-stone-600">Grade = Age − 5</span>{" "}
          (e.g. age 5 = Kindergarten, age 11 = Grade 6), aligning with the target
          age range captured during platform evaluation.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200/80">
        <Table className="[&_td]:py-3 [&_td]:align-top [&_th]:h-12 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-stone-500">
          <TableHeader>
            <TableRow>
              <TableHead>Grade band</TableHead>
              <TableHead>Learner level</TableHead>
              <TableHead>CEFR range</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map((g) =>
              g.rows.map((r, i) => (
                <TableRow key={r.id}>
                  {i === 0 ? (
                    <TableCell
                      rowSpan={g.rows.length}
                      className="border-r border-stone-100 font-semibold text-emerald-950"
                    >
                      {g.band}
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium text-stone-700">
                    {r.learnerLevel}
                  </TableCell>
                  <TableCell className="text-[13px] text-stone-600">{r.cefrRange}</TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
