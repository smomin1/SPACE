import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { vitalLevelSchema } from "@/lib/vital/schema";

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

  const parsed = vitalLevelSchema.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Bad Request", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const level = await prisma.vitalLevel.update({ where: { id }, data: parsed.data });
    return Response.json({ level });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: string }).code;
      if (code === "P2025") return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
      if (code === "P2002") return Response.json({ error: "A level with this code already exists", code: "DUPLICATE" }, { status: 409 });
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

  const refs = await prisma.vitalRecommendation.count({ where: { levelId: id } });
  if (refs > 0) {
    return Response.json(
      { error: "Cannot delete: level is used by recommendations", code: "HAS_RECOMMENDATIONS" },
      { status: 409 }
    );
  }

  try {
    await prisma.vitalLevel.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025") {
      return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }
    return Response.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
