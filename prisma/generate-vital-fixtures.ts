// One-off generator: parses the three idea/VITAL workbooks into committed JSON
// fixtures consumed by seed-vital.ts. Re-run when the source workbooks change:
//   npx tsx prisma/generate-vital-fixtures.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseVitalWorkbook, type ParsedTool, type ParsedRecommendation } from "../lib/vital/parse";

const DIR = join(process.cwd(), "idea", "VITAL");
const OUT = join(process.cwd(), "prisma", "vital-data");

function parse(file: string) {
  return parseVitalWorkbook(readFileSync(join(DIR, file)));
}

const toolLandscape = parse("Tool_Landscape_Report.xlsx");
const levelStack = parse("VITAL_Level_Stack_Engine.xlsx");
const recEngine = parse("VITAL_Recommendation_Engine.xlsx");

const tools: ParsedTool[] = toolLandscape.tools;
// Prefer the Recommendation Engine combos (richest); fall back to level stack.
const recommendations: ParsedRecommendation[] =
  recEngine.recommendations.length > 0
    ? recEngine.recommendations
    : levelStack.recommendations;

const teaching = tools.filter((t) => !t.isAssessmentTool);
const assessment = tools.filter((t) => t.isAssessmentTool);

writeFileSync(join(OUT, "tools.json"), JSON.stringify(tools, null, 2));
writeFileSync(
  join(OUT, "recommendations.json"),
  JSON.stringify(recommendations, null, 2)
);
writeFileSync(join(OUT, "levels.json"), JSON.stringify(levelStack.levels, null, 2));

console.log("VITAL fixtures generated:");
console.log(`  tools: ${tools.length} (teaching ${teaching.length}, assessment ${assessment.length})`);
console.log(`  recommendations: ${recommendations.length}`);
console.log(`  levels (LevelData): ${levelStack.levels.length}`);

// Sanity: list any recommendation tool names missing from the catalogue.
const names = new Set(tools.map((t) => t.name));
const missing = new Set<string>();
for (const r of recommendations) {
  if (r.coreTool && !names.has(r.coreTool)) missing.add(r.coreTool);
  if (r.suppTool && !names.has(r.suppTool)) missing.add(r.suppTool);
}
if (missing.size) {
  console.log(`  ⚠ recommendation tools not in catalogue: ${[...missing].join(", ")}`);
}
