-- CreateEnum
CREATE TYPE "VitalPillar" AS ENUM ('V', 'I', 'T', 'A', 'L');

-- CreateEnum
CREATE TYPE "VitalRating" AS ENUM ('Y', 'P', 'N');

-- CreateEnum
CREATE TYPE "VitalCoverage" AS ENUM ('FULL', 'PARTIAL', 'NONE', 'NA');

-- CreateEnum
CREATE TYPE "VitalDependency" AS ENUM ('TEACHER_LED', 'PARTIAL', 'STUDENT', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "VitalToolDependency" AS ENUM ('FULLY_TEACHER_LED', 'MOSTLY_TEACHER_LED', 'BLENDED', 'MOSTLY_INDEPENDENT', 'FULLY_INDEPENDENT');

-- CreateEnum
CREATE TYPE "VitalRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "VitalVerdict" AS ENUM ('POOR_FIT', 'PARTIAL_FIT', 'GOOD_FIT', 'STRONG_FIT');

-- CreateEnum
CREATE TYPE "VitalToolRole" AS ENUM ('CORE', 'SUPPLEMENTARY', 'RESOURCE_BANK', 'TEACHER_TOOL', 'ASSESSMENT');

-- CreateEnum
CREATE TYPE "VitalComplianceStatus" AS ENUM ('COMPLIANT', 'ONE_GAP', 'MULTI_GAP');

-- AlterEnum
ALTER TYPE "EvaluatorType" ADD VALUE 'VITAL';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'VITAL_EVALUATOR';

-- CreateTable
CREATE TABLE "VitalSkill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalLevel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "scoreBand" TEXT NOT NULL,
    "cefrStatus" TEXT NOT NULL,
    "bandGroup" TEXT NOT NULL,
    "isPreEmergent" BOOLEAN NOT NULL DEFAULT false,
    "assessmentOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VitalLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalTool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "VitalToolRole" NOT NULL,
    "vitalScore10" INTEGER,
    "v2Score50" INTEGER,
    "verdict" "VitalVerdict",
    "deFactoRisk" "VitalRisk",
    "overallDependency" "VitalToolDependency",
    "belowA0" BOOLEAN NOT NULL DEFAULT false,
    "cefrRangeLabel" TEXT,
    "isAssessmentTool" BOOLEAN NOT NULL DEFAULT false,
    "adaptiveTesting" TEXT,
    "notes" TEXT,
    "platformId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VitalTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalToolPillarRating" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "pillar" "VitalPillar" NOT NULL,
    "rating" "VitalRating" NOT NULL,

    CONSTRAINT "VitalToolPillarRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalToolSkillCoverage" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "coverage" "VitalCoverage" NOT NULL,
    "dependency" "VitalDependency",

    CONSTRAINT "VitalToolSkillCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalToolLevelMapping" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "coverage" "VitalCoverage" NOT NULL,

    CONSTRAINT "VitalToolLevelMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalRecommendation" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "coreToolId" TEXT,
    "suppToolId" TEXT,
    "coreDependency" "VitalToolDependency",
    "suppDependency" "VitalToolDependency",
    "coreRisk" "VitalRisk",
    "suppRisk" "VitalRisk",
    "pillarV" "VitalCoverage" NOT NULL,
    "pillarI" "VitalCoverage" NOT NULL,
    "pillarT" "VitalCoverage" NOT NULL,
    "pillarA" "VitalCoverage" NOT NULL,
    "pillarL" "VitalCoverage" NOT NULL,
    "status" "VitalComplianceStatus" NOT NULL,
    "deploymentNote" TEXT,

    CONSTRAINT "VitalRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalImportLog" (
    "id" TEXT NOT NULL,
    "importedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "workbookType" TEXT NOT NULL,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "detail" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VitalSkill_name_key" ON "VitalSkill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VitalLevel_code_key" ON "VitalLevel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VitalTool_name_key" ON "VitalTool"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VitalToolPillarRating_toolId_pillar_key" ON "VitalToolPillarRating"("toolId", "pillar");

-- CreateIndex
CREATE UNIQUE INDEX "VitalToolSkillCoverage_toolId_skillId_key" ON "VitalToolSkillCoverage"("toolId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "VitalToolLevelMapping_toolId_levelId_key" ON "VitalToolLevelMapping"("toolId", "levelId");

-- CreateIndex
CREATE UNIQUE INDEX "VitalRecommendation_skillId_levelId_key" ON "VitalRecommendation"("skillId", "levelId");

-- AddForeignKey
ALTER TABLE "VitalTool" ADD CONSTRAINT "VitalTool_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalToolPillarRating" ADD CONSTRAINT "VitalToolPillarRating_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "VitalTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalToolSkillCoverage" ADD CONSTRAINT "VitalToolSkillCoverage_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "VitalTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalToolSkillCoverage" ADD CONSTRAINT "VitalToolSkillCoverage_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "VitalSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalToolLevelMapping" ADD CONSTRAINT "VitalToolLevelMapping_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "VitalTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalToolLevelMapping" ADD CONSTRAINT "VitalToolLevelMapping_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "VitalLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalRecommendation" ADD CONSTRAINT "VitalRecommendation_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "VitalSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalRecommendation" ADD CONSTRAINT "VitalRecommendation_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "VitalLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalRecommendation" ADD CONSTRAINT "VitalRecommendation_coreToolId_fkey" FOREIGN KEY ("coreToolId") REFERENCES "VitalTool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalRecommendation" ADD CONSTRAINT "VitalRecommendation_suppToolId_fkey" FOREIGN KEY ("suppToolId") REFERENCES "VitalTool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalImportLog" ADD CONSTRAINT "VitalImportLog_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
