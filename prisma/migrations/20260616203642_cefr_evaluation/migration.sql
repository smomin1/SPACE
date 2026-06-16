-- CreateEnum
CREATE TYPE "CefrAnswer" AS ENUM ('YES', 'PARTIAL', 'NO', 'NA');

-- CreateEnum
CREATE TYPE "CefrSkillGroup" AS ENUM ('LS', 'RWVG');

-- CreateEnum
CREATE TYPE "CefrEvalStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateTable
CREATE TABLE "CefrSkill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" "CefrSkillGroup" NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CefrSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CefrLevel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CefrLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CefrQuestion" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "num" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "quickReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CefrQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CefrEvaluation" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "status" "CefrEvalStatus" NOT NULL DEFAULT 'DRAFT',
    "alignmentPct" DOUBLE PRECISION,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CefrEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CefrResponse" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" "CefrAnswer" NOT NULL,
    "fitConfidence" INTEGER,
    "evidence" TEXT,
    "notes" TEXT,

    CONSTRAINT "CefrResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CefrSkill_name_key" ON "CefrSkill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CefrLevel_code_key" ON "CefrLevel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CefrQuestion_levelId_skillId_num_key" ON "CefrQuestion"("levelId", "skillId", "num");

-- CreateIndex
CREATE UNIQUE INDEX "CefrEvaluation_platformId_key" ON "CefrEvaluation"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "CefrResponse_evaluationId_questionId_key" ON "CefrResponse"("evaluationId", "questionId");

-- AddForeignKey
ALTER TABLE "CefrQuestion" ADD CONSTRAINT "CefrQuestion_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "CefrLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CefrQuestion" ADD CONSTRAINT "CefrQuestion_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "CefrSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CefrEvaluation" ADD CONSTRAINT "CefrEvaluation_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CefrEvaluation" ADD CONSTRAINT "CefrEvaluation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CefrResponse" ADD CONSTRAINT "CefrResponse_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "CefrEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CefrResponse" ADD CONSTRAINT "CefrResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CefrQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
