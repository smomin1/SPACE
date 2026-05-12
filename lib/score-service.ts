import type { PrismaClient } from "@prisma/client";

interface UpdateScoreParams {
  scoreId: string;
  changedById: string;
  newValue?: number | null;
  newEvidenceType?: string | null;
  newComment?: string | null;
  reason?: string;
}

export async function updateScore(prisma: PrismaClient, params: UpdateScoreParams) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.score.findUniqueOrThrow({
      where: { id: params.scoreId },
    });

    const updated = await tx.score.update({
      where: { id: params.scoreId },
      data: {
        ...(params.newValue !== undefined && { value: params.newValue }),
        ...(params.newEvidenceType !== undefined && { evidenceType: params.newEvidenceType as any }),
        ...(params.newComment !== undefined && { comment: params.newComment }),
      },
    });

    await tx.scoreAuditLog.create({
      data: {
        scoreId: params.scoreId,
        changedById: params.changedById,
        previousValue: existing.value,
        newValue: params.newValue ?? null,
        previousComment: existing.comment,
        newComment: params.newComment ?? null,
        reason: params.reason ?? null,
      },
    });

    return updated;
  });
}
