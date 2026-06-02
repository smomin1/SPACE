import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { vitalToolSchema } from "@/lib/vital/schema";
import { vitalScore10FromPillars } from "@/lib/vital/compute";

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

  const { pillarRatings, skillCoverage, levelMappings, ...scalar } = parsed.data;

  // VITAL/10 is derived: sum of the 5 pillar ratings (Y=2, P=1, N=0). Assessment
  // tools have no pillar profile, so their /10 stays null.
  const vitalScore10 = scalar.isAssessmentTool
    ? null
    : vitalScore10FromPillars((pillarRatings ?? []).map((p) => p.rating));

  try {
    const tool = await prisma.vitalTool.create({
      data: {
        ...scalar,
        vitalScore10,
        pillarRatings: pillarRatings?.length
          ? { create: pillarRatings }
          : undefined,
        skillCoverage: skillCoverage?.length
          ? { create: skillCoverage }
          : undefined,
        levelMappings: levelMappings?.length
          ? { create: levelMappings }
          : undefined,
      },
    });
    return Response.json({ tool }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return Response.json({ error: "A tool with this name already exists", code: "DUPLICATE" }, { status: 409 });
    }
    return Response.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
