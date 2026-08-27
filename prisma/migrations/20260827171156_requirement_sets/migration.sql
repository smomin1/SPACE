-- CreateTable
CREATE TABLE "RequirementSet" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequirementSet_key_key" ON "RequirementSet"("key");

-- Seed the "esl" domain that every existing ScreeningQuestion/SearchEvaluation
-- row implicitly belonged to before this migration.
INSERT INTO "RequirementSet" ("id", "key", "name", "order", "isActive", "createdAt", "updatedAt")
VALUES ('esl-requirement-set', 'esl', 'ESL Platforms', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: add nullable first so backfill can populate existing rows.
ALTER TABLE "ScreeningQuestion" ADD COLUMN "requirementSetId" TEXT;
ALTER TABLE "SearchEvaluation" ADD COLUMN "requirementSetId" TEXT;

-- Backfill: every existing row becomes explicitly tagged "esl".
UPDATE "ScreeningQuestion" SET "requirementSetId" = 'esl-requirement-set' WHERE "requirementSetId" IS NULL;
UPDATE "SearchEvaluation" SET "requirementSetId" = 'esl-requirement-set' WHERE "requirementSetId" IS NULL;

-- AlterTable: now safe to enforce NOT NULL.
ALTER TABLE "ScreeningQuestion" ALTER COLUMN "requirementSetId" SET NOT NULL;
ALTER TABLE "SearchEvaluation" ALTER COLUMN "requirementSetId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ScreeningQuestion_requirementSetId_idx" ON "ScreeningQuestion"("requirementSetId");

-- CreateIndex
CREATE INDEX "SearchEvaluation_requirementSetId_idx" ON "SearchEvaluation"("requirementSetId");

-- AddForeignKey
ALTER TABLE "SearchEvaluation" ADD CONSTRAINT "SearchEvaluation_requirementSetId_fkey" FOREIGN KEY ("requirementSetId") REFERENCES "RequirementSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningQuestion" ADD CONSTRAINT "ScreeningQuestion_requirementSetId_fkey" FOREIGN KEY ("requirementSetId") REFERENCES "RequirementSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
