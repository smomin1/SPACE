import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deriveRecommendation } from "@/lib/vital/derive";
import {
  loadToolsForDerive,
  createMissingRecommendationCells,
} from "@/lib/vital/derive-server";

// Recompute recommendations from the tool catalogue.
//   mode "respect-locks"  (default): keep locked tool slots, auto-pick the
//        rest, recompute all downstream fields.
//   mode "lock-mismatches": one-time reconciliation. Where the auto-pick
//        differs from the stored (authored) tool, lock that slot to preserve
//        the authored choice; then recompute downstream.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canDo(session.user.role, "manage:vital")) {
    return Response.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  let mode: "respect-locks" | "lock-mismatches" = "respect-locks";
  try {
    const body = (await request.json()) as { mode?: string };
    if (body?.mode === "lock-mismatches") mode = "lock-mismatches";
  } catch {
    // empty body → default mode
  }

  const tools = await loadToolsForDerive();

  // Fill in any missing skill × level cells from the catalogue first, so the
  // matrix is complete before we refresh existing rows.
  const { created } = await createMissingRecommendationCells(tools);

  const recs = await prisma.vitalRecommendation.findMany();

  let changed = 0;
  let lockedCore = 0;
  let lockedSupp = 0;

  await prisma.$transaction(async (tx) => {
    for (const r of recs) {
      let coreLocked = r.coreToolLocked;
      let suppLocked = r.suppToolLocked;

      if (mode === "lock-mismatches") {
        const auto = deriveRecommendation({
          skillId: r.skillId,
          levelId: r.levelId,
          tools,
        });
        if (!coreLocked && auto.coreToolId !== r.coreToolId) {
          coreLocked = true;
          lockedCore++;
        }
        if (!suppLocked && auto.suppToolId !== r.suppToolId) {
          suppLocked = true;
          lockedSupp++;
        }
      }

      const derived = deriveRecommendation({
        skillId: r.skillId,
        levelId: r.levelId,
        tools,
        coreToolLocked: coreLocked,
        suppToolLocked: suppLocked,
        coreToolId: r.coreToolId,
        suppToolId: r.suppToolId,
      });

      const dirty =
        coreLocked !== r.coreToolLocked ||
        suppLocked !== r.suppToolLocked ||
        derived.coreToolId !== r.coreToolId ||
        derived.suppToolId !== r.suppToolId ||
        derived.coreDependency !== r.coreDependency ||
        derived.suppDependency !== r.suppDependency ||
        derived.coreRisk !== r.coreRisk ||
        derived.suppRisk !== r.suppRisk ||
        derived.pillarV !== r.pillarV ||
        derived.pillarI !== r.pillarI ||
        derived.pillarT !== r.pillarT ||
        derived.pillarA !== r.pillarA ||
        derived.pillarL !== r.pillarL ||
        derived.status !== r.status;

      if (!dirty) continue;
      changed++;
      await tx.vitalRecommendation.update({
        where: { id: r.id },
        data: { coreToolLocked: coreLocked, suppToolLocked: suppLocked, ...derived },
      });
    }
  });

  return Response.json({ mode, total: recs.length, changed, created, lockedCore, lockedSupp });
}
