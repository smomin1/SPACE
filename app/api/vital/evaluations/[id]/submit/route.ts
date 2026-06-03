import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { vitalToolSchema } from "@/lib/vital/schema";
import { vitalScore10FromPillars } from "@/lib/vital/compute";
import { recomputeRecommendations } from "@/lib/vital/derive-server";
import { transitionEvaluation } from "@/lib/evaluation-state";

// A VITAL evaluator fills the platform's VitalTool profile and submits.
// One VitalTool is linked to the platform (upsert by platformId). On submit we
// mark the evaluator's assignment, recompute the recommendation engine against
// the updated catalogue, and advance the evaluation state when everyone is in.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id: evaluationId } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: { platform: true, assignments: true },
  });
  if (!evaluation) {
    return Response.json({ error: "Evaluation not found", code: "NOT_FOUND" }, { status: 404 });
  }
  if (evaluation.platform.track !== "VITAL") {
    return Response.json({ error: "Not a VITAL evaluation", code: "WRONG_TRACK" }, { status: 400 });
  }

  // Requester must be an assigned VITAL evaluator on this evaluation (or admin).
  const assignment = evaluation.assignments.find((a) => a.userId === session.user.id);
  const isAdmin = canDo(session.user.role, "manage:vital");
  if (!assignment && !isAdmin) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }
  if (evaluation.lockedAt) {
    return Response.json({ error: "Evaluation is locked", code: "LOCKED" }, { status: 403 });
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
  const vitalScore10 = scalar.isAssessmentTool
    ? null
    : vitalScore10FromPillars((pillarRatings ?? []).map((p) => p.rating));

  // Profile is owned by the platform; link is server-set, never client-trusted.
  const platformId = evaluation.platformId;
  const existing = await prisma.vitalTool.findFirst({ where: { platformId } });

  try {
    await prisma.$transaction(async (tx) => {
      let toolId: string;
      if (existing) {
        await tx.vitalTool.update({
          where: { id: existing.id },
          data: { ...scalar, platformId, vitalScore10 },
        });
        toolId = existing.id;
        await tx.vitalToolPillarRating.deleteMany({ where: { toolId } });
        await tx.vitalToolSkillCoverage.deleteMany({ where: { toolId } });
        await tx.vitalToolLevelMapping.deleteMany({ where: { toolId } });
      } else {
        const created = await tx.vitalTool.create({
          data: { ...scalar, platformId, vitalScore10 },
        });
        toolId = created.id;
      }

      if (pillarRatings?.length) {
        await tx.vitalToolPillarRating.createMany({
          data: pillarRatings.map((p) => ({ toolId, pillar: p.pillar, rating: p.rating })),
        });
      }
      if (skillCoverage?.length) {
        await tx.vitalToolSkillCoverage.createMany({
          data: skillCoverage.map((s) => ({
            toolId,
            skillId: s.skillId,
            coverage: s.coverage,
            dependency: s.dependency,
          })),
        });
      }
      if (levelMappings?.length) {
        await tx.vitalToolLevelMapping.createMany({
          data: levelMappings.map((m) => ({ toolId, levelId: m.levelId, coverage: m.coverage })),
        });
      }

      // Mark this evaluator submitted (admins editing without an assignment skip this).
      if (assignment) {
        await tx.evaluatorAssignment.update({
          where: { id: assignment.id },
          data: { hasSubmitted: true, submittedAt: new Date() },
        });
      }

      // Advance state when every assigned evaluator has submitted.
      const allSubmitted = evaluation.assignments.every(
        (a) => a.id === assignment?.id || a.hasSubmitted
      );
      if (allSubmitted && evaluation.state === "IN_PROGRESS") {
        await tx.evaluation.update({
          where: { id: evaluationId },
          data: { state: "MERGED" },
        });
      }
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return Response.json(
        { error: "A tool with this name already exists. Pick a different name.", code: "DUPLICATE" },
        { status: 409 }
      );
    }
    return Response.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 });
  }

  // VITAL evaluations have no conflict resolution phase. Once all evaluators
  // have submitted (state just advanced to MERGED), immediately finalise.
  // transitionEvaluation checks canTransitionTo which passes when there are
  // zero open conflict threads — always true for VITAL evaluations.
  const allSubmittedNow = evaluation.assignments.every(
    (a) => a.id === assignment?.id || a.hasSubmitted
  );
  if (allSubmittedNow && evaluation.state === "IN_PROGRESS") {
    await transitionEvaluation(evaluationId, "FINALISED", session.user.id);
  }

  // Catalogue changed → rebuild the recommendation matrix from it.
  const { changed, created } = await recomputeRecommendations();

  return Response.json({
    ok: true,
    recommendationsChanged: changed,
    recommendationsCreated: created,
  });
}
