-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('AI_SCREENING', 'CEFR', 'VITAL', 'PRD');

-- CreateEnum
CREATE TYPE "PipelineStageStatus" AS ENUM ('NOT_STARTED', 'QUEUED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "SearchEvaluation" ADD COLUMN     "platformId" TEXT;

-- CreateTable
CREATE TABLE "PipelineStageRun" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "stage" "PipelineStage" NOT NULL,
    "status" "PipelineStageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "score" DOUBLE PRECISION,
    "sourceId" TEXT,
    "passedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStageRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "aiThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "cefrThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "vitalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "prdThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "aiWeight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "cefrWeight" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "vitalWeight" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "prdWeight" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStageRun_platformId_stage_key" ON "PipelineStageRun"("platformId", "stage");

-- AddForeignKey
ALTER TABLE "SearchEvaluation" ADD CONSTRAINT "SearchEvaluation_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStageRun" ADD CONSTRAINT "PipelineStageRun_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
