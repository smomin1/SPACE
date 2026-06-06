-- CreateEnum
CREATE TYPE "VitalAnswer" AS ENUM ('YES', 'PARTIAL', 'NO', 'NA');

-- AlterTable
ALTER TABLE "VitalTool" ADD COLUMN     "v2Percent" INTEGER;

-- AlterTable
ALTER TABLE "VitalToolPillarRating" ADD COLUMN     "isOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overrideNote" TEXT;

-- CreateTable
CREATE TABLE "VitalQuestion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "pillar" "VitalPillar" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalQuestionResponse" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" "VitalAnswer" NOT NULL,

    CONSTRAINT "VitalQuestionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalStage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "pillars" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalStageRecommendation" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "coreText" TEXT,
    "suppText" TEXT,
    "vitalNote" TEXT,

    CONSTRAINT "VitalStageRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalGradeBand" (
    "id" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "learnerLevel" TEXT NOT NULL,
    "cefrRange" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalGradeBand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VitalQuestion_key_key" ON "VitalQuestion"("key");

-- CreateIndex
CREATE UNIQUE INDEX "VitalQuestionResponse_toolId_questionId_key" ON "VitalQuestionResponse"("toolId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "VitalStage_key_key" ON "VitalStage"("key");

-- CreateIndex
CREATE UNIQUE INDEX "VitalStageRecommendation_stageId_levelId_key" ON "VitalStageRecommendation"("stageId", "levelId");

-- CreateIndex
CREATE UNIQUE INDEX "VitalGradeBand_band_learnerLevel_key" ON "VitalGradeBand"("band", "learnerLevel");

-- AddForeignKey
ALTER TABLE "VitalQuestionResponse" ADD CONSTRAINT "VitalQuestionResponse_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "VitalTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalQuestionResponse" ADD CONSTRAINT "VitalQuestionResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "VitalQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalStageRecommendation" ADD CONSTRAINT "VitalStageRecommendation_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "VitalStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalStageRecommendation" ADD CONSTRAINT "VitalStageRecommendation_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "VitalLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
