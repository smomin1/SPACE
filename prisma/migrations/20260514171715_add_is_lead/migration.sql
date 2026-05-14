-- AlterTable
ALTER TABLE "EvaluatorAssignment" ADD COLUMN     "isLead" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PlatformEvaluatorAssignment" ADD COLUMN     "isLead" BOOLEAN NOT NULL DEFAULT false;
