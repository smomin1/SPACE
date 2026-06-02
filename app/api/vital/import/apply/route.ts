import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { applyVitalRecords } from "@/lib/vital/apply";
import type { ParsedTool, ParsedRecommendation, ParsedLevel } from "@/lib/vital/parse";

interface ApplyBody {
  workbookType?: string;
  fileName?: string;
  tools?: ParsedTool[];
  recommendations?: ParsedRecommendation[];
  levels?: ParsedLevel[];
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canDo(session.user.role, "manage:vital")) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  let body: ApplyBody;
  try {
    body = (await request.json()) as ApplyBody;
  } catch {
    return Response.json({ error: "Invalid JSON", code: "INVALID_JSON" }, { status: 400 });
  }

  const tools = body.tools ?? [];
  const recommendations = body.recommendations ?? [];
  const levels = body.levels ?? [];

  if (tools.length + recommendations.length + levels.length === 0) {
    return Response.json({ error: "Nothing to apply", code: "EMPTY" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(
      (tx) => applyVitalRecords(tx as unknown as typeof prisma, { tools, recommendations, levels }),
      { timeout: 30000 }
    );

    await prisma.vitalImportLog.create({
      data: {
        importedById: session.user.id,
        fileName: body.fileName ?? "upload.xlsx",
        workbookType: body.workbookType ?? "UNKNOWN",
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        detail: {
          tools: tools.map((t) => t.name),
          recommendations: recommendations.map((r) => `${r.skill}|${r.levelCode}`),
          levels: levels.map((l) => l.code),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("VITAL import apply failed", err);
    return Response.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
