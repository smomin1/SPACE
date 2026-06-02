import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { vitalToolSchema } from "@/lib/vital/schema";
import { vitalScore10FromPillars } from "@/lib/vital/compute";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canDo(session.user.role, "manage:vital")) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = vitalToolSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Bad Request", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { pillarRatings, skillCoverage, levelMappings, ...scalar } = parsed.data;

  // VITAL/10 is derived from the pillar ratings (Y=2, P=1, N=0). Only recompute
  // when the request carries pillar ratings; assessment tools keep a null /10.
  const scalarData =
    pillarRatings !== undefined
      ? {
          ...scalar,
          vitalScore10: scalar.isAssessmentTool
            ? null
            : vitalScore10FromPillars(pillarRatings.map((p) => p.rating)),
        }
      : scalar;

  try {
    const tool = await prisma.$transaction(async (tx) => {
      await tx.vitalTool.update({ where: { id }, data: scalarData });
      if (pillarRatings) {
        await tx.vitalToolPillarRating.deleteMany({ where: { toolId: id } });
        if (pillarRatings.length)
          await tx.vitalToolPillarRating.createMany({
            data: pillarRatings.map((p) => ({ ...p, toolId: id })),
          });
      }
      if (skillCoverage) {
        await tx.vitalToolSkillCoverage.deleteMany({ where: { toolId: id } });
        if (skillCoverage.length)
          await tx.vitalToolSkillCoverage.createMany({
            data: skillCoverage.map((s) => ({ ...s, toolId: id })),
          });
      }
      if (levelMappings) {
        await tx.vitalToolLevelMapping.deleteMany({ where: { toolId: id } });
        if (levelMappings.length)
          await tx.vitalToolLevelMapping.createMany({
            data: levelMappings.map((m) => ({ ...m, toolId: id })),
          });
      }
      return tx.vitalTool.findUnique({ where: { id } });
    });
    return Response.json({ tool });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: string }).code;
      if (code === "P2025") return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
      if (code === "P2002") return Response.json({ error: "A tool with this name already exists", code: "DUPLICATE" }, { status: 409 });
    }
    return Response.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canDo(session.user.role, "manage:vital")) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;

  const refs = await prisma.vitalRecommendation.count({
    where: { OR: [{ coreToolId: id }, { suppToolId: id }] },
  });
  if (refs > 0) {
    return Response.json(
      { error: "Cannot delete: tool is used by recommendations", code: "HAS_RECOMMENDATIONS" },
      { status: 409 }
    );
  }

  try {
    await prisma.vitalTool.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025") {
      return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }
    return Response.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
