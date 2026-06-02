import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { vitalRecommendationSchema } from "@/lib/vital/schema";
import { loadToolsForDerive, deriveFields } from "@/lib/vital/derive-server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  const recommendations = await prisma.vitalRecommendation.findMany({
    include: { skill: true, level: true, coreTool: true, suppTool: true },
  });
  return Response.json({ recommendations });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canDo(session.user.role, "manage:vital")) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON", code: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = vitalRecommendationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Bad Request", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const tools = await loadToolsForDerive();
  const derived = deriveFields(tools, {
    skillId: input.skillId,
    levelId: input.levelId,
    coreToolLocked: input.coreToolLocked,
    suppToolLocked: input.suppToolLocked,
    coreToolId: input.coreToolId,
    suppToolId: input.suppToolId,
  });

  try {
    const recommendation = await prisma.vitalRecommendation.create({
      data: {
        skillId: input.skillId,
        levelId: input.levelId,
        coreToolLocked: input.coreToolLocked,
        suppToolLocked: input.suppToolLocked,
        deploymentNote: input.deploymentNote,
        ...derived,
      },
    });
    return Response.json({ recommendation }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return Response.json(
        { error: "A recommendation for this skill + level already exists", code: "DUPLICATE" },
        { status: 409 }
      );
    }
    return Response.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
