import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { vitalToolSchema } from "@/lib/vital/schema";
import { writeToolProfile } from "@/lib/vital/responses-server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  const tools = await prisma.vitalTool.findMany({
    orderBy: [{ isAssessmentTool: "asc" }, { name: "asc" }],
    include: { pillarRatings: true, skillCoverage: true, levelMappings: true },
  });
  return Response.json({ tools });
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

  const parsed = vitalToolSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Bad Request", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Score fields (vitalScore10/v2Score50/v2Percent/verdict) and pillar letters are
  // derived from questionResponses; never trusted from the client. Children are
  // written explicitly so the question-driven and legacy paths share one code path.
  const {
    pillarRatings,
    pillarOverrides,
    questionResponses,
    skillCoverage,
    levelMappings,
    v2Score50,
    verdict,
    ...scalar
  } = parsed.data;

  try {
    const tool = await prisma.$transaction(async (tx) => {
      const created = await tx.vitalTool.create({ data: scalar });
      const scores = await writeToolProfile(tx, created.id, {
        isAssessmentTool: scalar.isAssessmentTool,
        questionResponses,
        pillarOverrides,
        pillarRatings,
        v2Score50,
        verdict,
      });
      if (skillCoverage?.length) {
        await tx.vitalToolSkillCoverage.createMany({
          data: skillCoverage.map((s) => ({ toolId: created.id, ...s })),
        });
      }
      if (levelMappings?.length) {
        await tx.vitalToolLevelMapping.createMany({
          data: levelMappings.map((m) => ({ toolId: created.id, ...m })),
        });
      }
      return tx.vitalTool.update({ where: { id: created.id }, data: scores });
    });
    return Response.json({ tool }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return Response.json({ error: "A tool with this name already exists", code: "DUPLICATE" }, { status: 409 });
    }
    return Response.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
