import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { parseVitalWorkbook } from "@/lib/vital/parse";
import {
  flattenTool,
  flattenRecommendation,
  flattenLevel,
  diffTools,
  diffRecommendations,
  diffLevels,
  type Flat,
} from "@/lib/vital/diff";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canDo(session.user.role, "manage:vital")) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid multipart form data", code: "BAD_FORM" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file uploaded", code: "NO_FILE" }, { status: 400 });
  }
  if (!file.name.endsWith(".xlsx")) {
    return Response.json({ error: "Only .xlsx files are supported", code: "INVALID_FILE_TYPE" }, { status: 400 });
  }

  let result;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    result = parseVitalWorkbook(buffer);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Could not parse the uploaded file", code: "PARSE_ERROR" },
      { status: 400 }
    );
  }

  const { workbookType } = result;

  if (workbookType === "TOOL_LANDSCAPE") {
    const dbTools = await prisma.vitalTool.findMany({
      include: { pillarRatings: true, skillCoverage: { include: { skill: true } }, levelMappings: { include: { level: true } } },
    });
    const existing = new Map<string, Flat>(
      dbTools.map((t) => [
        t.name.toLowerCase(),
        flattenTool({
          ...t,
          skillCoverage: t.skillCoverage.map((s) => ({
            skill: s.skill.name,
            coverage: s.coverage,
            dependency: s.dependency,
          })),
          levelMappings: t.levelMappings.map((m) => ({ level: { code: m.level.code }, coverage: m.coverage })),
        }),
      ])
    );
    const diff = diffTools(result.tools, existing);
    return Response.json({ workbookType, fileName: file.name, diff });
  }

  if (workbookType === "RECOMMENDATION" || workbookType === "LEVEL_STACK") {
    const dbRecs = await prisma.vitalRecommendation.findMany({
      include: { skill: true, level: true, coreTool: true, suppTool: true },
    });
    const existing = new Map<string, Flat>(
      dbRecs.map((r) => [
        `${r.skill.name}|${r.level.code}`.toLowerCase(),
        flattenRecommendation({
          coreTool: r.coreTool?.name ?? null,
          suppTool: r.suppTool?.name ?? null,
          coreDependency: r.coreDependency,
          suppDependency: r.suppDependency,
          coreRisk: r.coreRisk,
          suppRisk: r.suppRisk,
          pillarV: r.pillarV,
          pillarI: r.pillarI,
          pillarT: r.pillarT,
          pillarA: r.pillarA,
          pillarL: r.pillarL,
          status: r.status,
          deploymentNote: r.deploymentNote,
        }),
      ])
    );
    const recDiff = diffRecommendations(result.recommendations, existing);

    // Level Stack workbooks also carry level definitions.
    let levelDiff = undefined;
    if (result.levels.length) {
      const dbLevels = await prisma.vitalLevel.findMany();
      const levelExisting = new Map<string, Flat>(
        dbLevels.map((l) => [l.code.toLowerCase(), flattenLevel(l)])
      );
      levelDiff = diffLevels(result.levels, levelExisting);
    }

    return Response.json({ workbookType, fileName: file.name, diff: recDiff, levelDiff });
  }

  return Response.json({ error: "Unknown workbook type", code: "UNKNOWN_TYPE" }, { status: 422 });
}
