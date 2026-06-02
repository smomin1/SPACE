import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { vitalRecommendationSchema } from "@/lib/vital/schema";
import { loadToolsForDerive, deriveFields } from "@/lib/vital/derive-server";

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

  const parsed = vitalRecommendationSchema.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Bad Request", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.vitalRecommendation.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Merge the editorial fields the client sent over the stored row, then derive
  // tool pairing + all downstream fields from the effective state.
  const p = parsed.data;
  const effective = {
    skillId: p.skillId ?? existing.skillId,
    levelId: p.levelId ?? existing.levelId,
    coreToolLocked: p.coreToolLocked ?? existing.coreToolLocked,
    suppToolLocked: p.suppToolLocked ?? existing.suppToolLocked,
    coreToolId: p.coreToolId !== undefined ? p.coreToolId : existing.coreToolId,
    suppToolId: p.suppToolId !== undefined ? p.suppToolId : existing.suppToolId,
  };
  const tools = await loadToolsForDerive();
  const derived = deriveFields(tools, effective);

  try {
    const recommendation = await prisma.vitalRecommendation.update({
      where: { id },
      data: {
        skillId: effective.skillId,
        levelId: effective.levelId,
        coreToolLocked: effective.coreToolLocked,
        suppToolLocked: effective.suppToolLocked,
        deploymentNote: p.deploymentNote !== undefined ? p.deploymentNote : existing.deploymentNote,
        ...derived,
      },
    });
    return Response.json({ recommendation });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025") {
      return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
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

  try {
    await prisma.vitalRecommendation.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025") {
      return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }
    return Response.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
