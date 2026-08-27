// Seeds the Tool Scanner's 50 AI screening questions from the committed data file.
// Idempotent: matches on `num` and updates in place, so re-running never wipes
// existing ScreeningResponse rows (which cascade off ScreeningQuestion).
import type { PrismaClient } from "@prisma/client";
import { SCREENING_QUESTIONS } from "./screening-data";

export async function seedScreening(prisma: PrismaClient) {
  const eslSet = await prisma.requirementSet.upsert({
    where: { key: "esl" },
    update: {},
    create: { key: "esl", name: "ESL Platforms", order: 0 },
  });

  for (const q of SCREENING_QUESTIONS) {
    const existing = await prisma.screeningQuestion.findFirst({
      where: { num: q.num, requirementSetId: eslSet.id },
    });
    if (existing) {
      await prisma.screeningQuestion.update({
        where: { id: existing.id },
        data: {
          category: q.category,
          question: q.question,
          whatToLookFor: q.whatToLookFor,
          hardFail: q.hardFail,
        },
      });
    } else {
      await prisma.screeningQuestion.create({
        data: {
          num: q.num,
          category: q.category,
          question: q.question,
          whatToLookFor: q.whatToLookFor,
          hardFail: q.hardFail,
          requirementSetId: eslSet.id,
        },
      });
    }
  }

  const count = await prisma.screeningQuestion.count({ where: { requirementSetId: eslSet.id } });
  console.log(`Seeded screening questions (${count} total).`);
}
