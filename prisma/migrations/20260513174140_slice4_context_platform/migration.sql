-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PEDAGOGY_EVALUATOR', 'TECHNICAL_EVALUATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "EvaluationState" AS ENUM ('IN_PROGRESS', 'MERGED', 'FINALISED');

-- CreateEnum
CREATE TYPE "EvaluatorType" AS ENUM ('COMPLIANCE', 'PEDAGOGY', 'TECHNICAL');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('TRIAL', 'DEMO', 'DOCUMENTATION', 'VENDOR_CLAIM');

-- CreateEnum
CREATE TYPE "WeightLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "PlatformStatus" AS ENUM ('ACTIVE', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "CEFRLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "LearningLevel" AS ENUM ('EARLY_CHILDHOOD', 'K12', 'HIGHER_ED', 'ADULT_LEARNING', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "Skill" AS ENUM ('READING', 'WRITING', 'LISTENING', 'SPEAKING', 'GRAMMAR', 'VOCABULARY', 'PRONUNCIATION');

-- CreateEnum
CREATE TYPE "DeploymentMode" AS ENUM ('CLOUD', 'ON_PREMISE', 'HYBRID');

-- CreateEnum
CREATE TYPE "LicenceType" AS ENUM ('PERPETUAL', 'SUBSCRIPTION', 'PER_SEAT', 'SITE_LICENCE', 'OPEN_SOURCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "status" "PlatformStatus" NOT NULL DEFAULT 'ACTIVE',
    "licenceType" "LicenceType",
    "trialAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "state" "EvaluationState" NOT NULL DEFAULT 'IN_PROGRESS',
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluatorAssignment" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "evaluatorType" "EvaluatorType" NOT NULL,
    "hasSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluatorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Context" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "learningLevels" "LearningLevel"[],
    "cefrMin" "CEFRLevel",
    "cefrMax" "CEFRLevel",
    "skills" "Skill"[],
    "deploymentMode" "DeploymentMode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformContext" (
    "platformId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,

    CONSTRAINT "PlatformContext_pkey" PRIMARY KEY ("platformId","contextId")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evaluatorType" "EvaluatorType" NOT NULL,
    "weight" "WeightLevel" NOT NULL,
    "isComplianceGate" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementContext" (
    "requirementId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,

    CONSTRAINT "RequirementContext_pkey" PRIMARY KEY ("requirementId","contextId")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER,
    "evidenceType" "EvidenceType",
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreAuditLog" (
    "id" TEXT NOT NULL,
    "scoreId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "previousValue" INTEGER,
    "newValue" INTEGER,
    "previousEvidenceType" "EvidenceType",
    "newEvidenceType" "EvidenceType",
    "previousComment" TEXT,
    "newComment" TEXT,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictThread" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConflictThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformEvaluatorAssignment" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "evaluatorType" "EvaluatorType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformEvaluatorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConflictMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluatorAssignment_evaluationId_userId_key" ON "EvaluatorAssignment"("evaluationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Context_name_key" ON "Context"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Score_evaluationId_requirementId_userId_key" ON "Score"("evaluationId", "requirementId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConflictThread_evaluationId_requirementId_key" ON "ConflictThread"("evaluationId", "requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformEvaluatorAssignment_platformId_userId_key" ON "PlatformEvaluatorAssignment"("platformId", "userId");

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluatorAssignment" ADD CONSTRAINT "EvaluatorAssignment_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluatorAssignment" ADD CONSTRAINT "EvaluatorAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformContext" ADD CONSTRAINT "PlatformContext_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformContext" ADD CONSTRAINT "PlatformContext_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "Context"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementContext" ADD CONSTRAINT "RequirementContext_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementContext" ADD CONSTRAINT "RequirementContext_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "Context"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreAuditLog" ADD CONSTRAINT "ScoreAuditLog_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "Score"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreAuditLog" ADD CONSTRAINT "ScoreAuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictThread" ADD CONSTRAINT "ConflictThread_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictThread" ADD CONSTRAINT "ConflictThread_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictThread" ADD CONSTRAINT "ConflictThread_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformEvaluatorAssignment" ADD CONSTRAINT "PlatformEvaluatorAssignment_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformEvaluatorAssignment" ADD CONSTRAINT "PlatformEvaluatorAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictMessage" ADD CONSTRAINT "ConflictMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ConflictThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictMessage" ADD CONSTRAINT "ConflictMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
